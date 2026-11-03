'use strict';
const {checkInput}=require('./core');
const {validate}=require('./validator');
function random(seed){let z=seed>>>0;return ()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);}
function candidate(p,jobs,widths,rng,mode){
 const W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim,k=p.kerf,t=p.trim;
 const sheets=[],free=[];
 const leaf=rect=>({kind:'waste',rect});
 function newSheet(){
  const sh={parts:[],primaryStrips:[]};sheets.push(sh);
  let r={x:t,y:t,w:W,h:H},root=leaf(r),n=root;
  widths.forEach((width,i)=>{
   if(i===widths.length-1){sh.primaryStrips.push({index:i+1,rect:{...r},node:n});free.push(n);return;}
   const strip={...r,w:width},next={...r,x:r.x+width+k,w:r.w-width-k};
   n.kind='cut';n.axis='V';n.pos=r.x+width;n.kerf=k;n.first=leaf(strip);n.second=leaf(next);
   sh.primaryStrips.push({index:i+1,rect:strip,node:n.first});free.push(n.first);
   n=n.second;r=next;
  });
  sh.tree=root;
 }
 for(const job of jobs){
  const oo=[{w:job.l,h:job.w,rotated:false},...(job.grain===false?[{w:job.w,h:job.l,rotated:true}]:[])];
  let best=null;
  function choose(){
   for(let i=0;i<free.length;i++)for(const o of oo){
    const r=free[i].rect,dw=r.w-o.w,dh=r.h-o.h;
    if(dw<0||dh<0||(dw!==0&&dw<k)||(dh!==0&&dh<k))continue;
    const score=mode%3===0?r.w*r.h-o.w*o.h:mode%3===1?Math.min(dw,dh):Math.max(dw,dh);
    if(!best||score<best.score)best={i,o,score};
   }
  }
  choose();if(!best){newSheet();choose();}
  if(!best)return null;
  const n=free.splice(best.i,1)[0],o=best.o;
  function split(node,axis,size){
   const r=node.rect,v=axis==='V',span=v?r.w:r.h;
   if(span===size)return node;
   node.kind='cut';node.axis=axis;node.pos=(v?r.x:r.y)+size;node.kerf=k;
   node.first=leaf(v?{...r,w:size}:{...r,h:size});
   node.second=leaf(v?{...r,x:node.pos+k,w:span-size-k}:{...r,y:node.pos+k,h:span-size-k});
   if(node.second.rect.w>0&&node.second.rect.h>0)free.push(node.second);
   return node.first;
  }
  const vertical=rng()<0.5;
  let part=split(n,vertical?'V':'H',vertical?o.w:o.h);
  part=split(part,vertical?'H':'V',vertical?o.h:o.w);
  part.kind='part';part.part={id:job.id,instance:job.instance,rotated:o.rotated};
 }
 let number=0;
 for(const sh of sheets){
  sh.remnants=[];function visit(n){
   if(n.kind==='cut'){n.number=++number;visit(n.first);visit(n.second);}
   else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});
   else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});
  }visit(sh.tree);
  // Paths identify primary strip subtrees independently of object identity after JSON.
  function path(n,target,p='r'){if(n===target)return p;if(n.kind!=='cut')return null;return path(n.first,target,p+'/0')??path(n.second,target,p+'/1');}
  sh.primaryStrips=sh.primaryStrips.map(a=>({index:a.index,rect:a.rect,path:path(sh.tree,a.node)}));
 }
 return {sheets,partCount:jobs.length,partOrder:jobs.map(j=>[j.id,j.instance]),method:'staged-primary-strip-multistart',optimality:'not proven'};
}
function widthsFor(p,jobs,rng,index,groupWidths){
 const W=p.sheetW-2*p.trim,k=p.kerf;
 const values=[...new Set(jobs.flatMap(a=>[a.l,...(a.grain===false?[a.w]:[])]))].filter(x=>x<=W).sort((a,b)=>b-a);
 const pool=[...new Set([...values,...groupWidths])];
 // Identical parts form candidate side-by-side blocks, including their internal kerfs.
 for(const v of values)for(let q=2;q<=4;q++)if(q*v+(q-1)*k<W)pool.push(q*v+(q-1)*k);
 let left=W,arr=[];
 // Deterministic baseline considers a broad two/three-strip set; other starts sample groups.
 const count=2+index%4;
 for(let i=0;i<count-1;i++){
  const fits=pool.filter(v=>v+k<left&&left-v-k>=Math.min(...values));
  if(!fits.length)break;
  const v=index<values.length?fits[Math.min(index,fits.length-1)]:fits[Math.floor(rng()*fits.length)];
  arr.push(v);left-=v+k;
 }
 arr.push(left);return arr;
}
function searchStaged(p,options={}){
 const {jobs}=checkInput(p),iterations=options.iterations??10000,rng=random(options.seed??1);
 if(!Number.isSafeInteger(iterations)||iterations<1)throw Error('Invalid staged budget');
 const {makeStagedPlan}=require('./staged-plan');
 const {validateStaged}=require('./staged-validator');
 const profile=options.profile;
 if(!profile)throw Error('Explicit staged equipment profile required');
 let best=null,score=null,rejected=0,failures=0,lastError=null,geometryCandidates=0,boundPruned=0;
 const distribution={},start=Date.now();
 // Bounded subset-sum DP proposes mixed block widths, with actual instance multiplicities.
 // It generates candidates; it does not prove optimality of nesting or of the strip plan.
 const cap=p.sheetW-2*p.trim,dp=Array.from({length:4},()=>new Set());
 dp[0].add(0);
 for(const job of jobs)for(let count=3;count>=1;count--)for(const sum of dp[count-1]){
  const next=sum+job.l+(count>1?p.kerf:0);if(next<cap)dp[count].add(next);
 }
 const groupWidths=[...new Set([...dp[2],...dp[3]])];
 const byInstance=new Map(jobs.map(j=>[JSON.stringify([j.id,j.instance]),j]));
 let localStates=0;
 const better=v=>!score||v.some((x,i)=>x<score[i]&&v.slice(0,i).every((y,j)=>y===score[j]));
 function consider(s){
  const geometry=validate(p,s);geometryCandidates++;distribution[geometry.sheets]=(distribution[geometry.sheets]??0)+1;
  const preliminary=[geometry.sheets,-geometry.largestWaste];
  if(score&&(preliminary[0]>score[0]||(preliminary[0]===score[0]&&preliminary[1]>score[1]))){boundPruned++;return;}
  try{
   const plan=makeStagedPlan(p,s,profile),checked=validateStaged(p,s,plan,profile);
   const m=checked.metrics,v=[geometry.sheets,-geometry.largestWaste,m.stages,m.turns,m.cuts,m.cutLength];
   if(better(v)){best=s;score=v;best.plan=plan;best.verification=checked;best.metrics={...geometry,...m};}
  }catch(e){rejected++;lastError=e.message;}
 }
 if(options.previous)consider(JSON.parse(JSON.stringify(options.previous)));
 for(let i=0;i<iterations;i++){
  let widths=widthsFor(p,jobs,rng,i,groupWidths);
  let order=jobs.map(j=>({j,key:-(j.l*j.w)*(i===0?1:0.15+rng()*1.7)})).sort((a,b)=>a.key-b.key).map(a=>a.j);
  if(best&&i%4===3&&best.partOrder?.length===jobs.length){
   const inherited=best.partOrder.map(key=>byInstance.get(JSON.stringify(key)));
   if(inherited.every(Boolean)&&new Set(inherited).size===jobs.length){
    localStates++;order=inherited;
    if(order.length>1){const a=Math.floor(rng()*order.length),b=Math.floor(rng()*order.length);[order[a],order[b]]=[order[b],order[a]];}
    widths=best.sheets[0].primaryStrips.map(s=>s.rect.w);
    if(widths.length>1&&rng()<0.5){
     const a=Math.floor(rng()*(widths.length-1)),delta=(rng()<0.5?-1:1)*(1+Math.floor(rng()*50));
     if(widths[a]+delta>0&&widths[a+1]-delta>0){widths[a]+=delta;widths[a+1]-=delta;}
    }
   }
  }
  const s=candidate(p,order,widths,rng,i);
  if(s)consider(s);else failures++;
 }
 if(!best)throw Error('No validated staged solution found: '+(lastError??'primary strip widths cannot accommodate a part'));
 best.parameters=JSON.parse(JSON.stringify(p));best.equipmentProfile=JSON.parse(JSON.stringify(profile));
 best.search={seed:options.seed??1,iterations,states:iterations,pruned:boundPruned+failures,boundPruned,geometryCandidates,localStates,dpGroupWidths:groupWidths.length,failedWidthAssignments:failures,technologyRejected:rejected,lastError,distribution,elapsedMs:Date.now()-start};
 return best;
}
module.exports={searchStaged};
