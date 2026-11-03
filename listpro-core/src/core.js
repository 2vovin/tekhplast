'use strict';
const {validate}=require('./validator');
const {makePlan}=require('./machine-plan');
const {validateTechnology}=require('./technology-validator');
function checkInput(p){
 // Use independent validation of input before allocating instances.
 if(!p||!Array.isArray(p.pieces)||!['sheetW','sheetH','kerf','trim'].every(k=>Number.isFinite(p[k]))||p.kerf<0||p.trim<0||p.sheetW<=2*p.trim||p.sheetH<=2*p.trim)throw Error('Invalid sheet or list');
 const jobs=[],ids=new Set();
 p.pieces.forEach((a,i)=>{
  const id=a.id??i+1;
  if(ids.has(JSON.stringify(id))||!Number.isFinite(a.l)||!Number.isFinite(a.w)||a.l<=0||a.w<=0||!Number.isSafeInteger(a.q)||a.q<1)throw Error('Invalid part');
  ids.add(JSON.stringify(id));
  for(let j=1;j<=a.q;j++)jobs.push({...a,id,instance:j});
 });
 return {w:p.sheetW-2*p.trim,h:p.sheetH-2*p.trim,jobs};
}
function rng(seed){let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);}
function trial(p,jobs,random,mode){
 const W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim,k=p.kerf;
 const sheets=[],free=[];
 const leaf=r=>({kind:'waste',rect:r});
 for(const j of jobs){
  let best=null;
  const orientations=[{w:j.l,h:j.w,rotated:false},...(j.grain===false?[{w:j.w,h:j.l,rotated:true}]:[])];
  const fit=(r,o)=>o.w<=r.w&&o.h<=r.h&&(r.w===o.w||r.w-o.w>=k)&&(r.h===o.h||r.h-o.h>=k);
  for(let i=0;i<free.length;i++)for(const o of orientations)if(fit(free[i].rect,o)){
   const r=free[i].rect,dw=r.w-o.w,dh=r.h-o.h;
   const score=mode%3===0?r.w*r.h-o.w*o.h:mode%3===1?Math.min(dw,dh):Math.max(dw,dh);
   if(!best||score<best.score)best={i,o,score};
  }
  if(!best){
   const r={x:p.trim,y:p.trim,w:W,h:H},o=orientations.find(o=>fit(r,o));
   if(!o)throw Error('Part does not fit');
   const tree=leaf(r);sheets.push({tree,parts:[]});free.push(tree);best={i:free.length-1,o};
  }
  const node=free.splice(best.i,1)[0],r=node.rect,o=best.o;
  const part={id:j.id,instance:j.instance,rotated:o.rotated,x:r.x,y:r.y,w:o.w,h:o.h};
  // Split in either order; every cut spans its entire current rectangle.
  function split(n,axis,size){
   const a=axis==='V',rr=n.rect,span=a?rr.w:rr.h;
   if(span===size)return n;
   n.kind='cut';n.axis=axis;n.pos=(a?rr.x:rr.y)+size;n.kerf=k;
   n.first=leaf(a?{...rr,w:size}:{...rr,h:size});
   n.second=leaf(a?{...rr,x:n.pos+k,w:span-size-k}:{...rr,y:n.pos+k,h:span-size-k});
   if(n.second.rect.w>0&&n.second.rect.h>0)free.push(n.second);
   return n.first;
  }
  const vertical=random()<0.5;
  let n=split(node,vertical?'V':'H',vertical?o.w:o.h);
  n=split(n,vertical?'H':'V',vertical?o.h:o.w);
  n.kind='part';n.part={id:j.id,instance:j.instance,rotated:o.rotated};
 }
 let num=0;
 function collect(n,sh){
  if(n.kind==='cut'){n.number=++num;collect(n.first,sh);collect(n.second,sh);}
  else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});
 }
 sheets.forEach(sh=>{
  collect(sh.tree,sh);sh.remnants=[];sh.cuts=[];
  function exportNode(n){if(n.kind==='cut'){sh.cuts.push({number:n.number,axis:n.axis,pos:n.pos,kerf:n.kerf,rect:{...n.rect}});exportNode(n.first);exportNode(n.second);}else if(n.kind==='waste')sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}
  exportNode(sh.tree);
 });
 return {sheets,partCount:jobs.length,method:'seeded-guillotine-multistart',optimality:'not proven'};
}
function pack(p,options={}){
 const {jobs}=checkInput(p),iterations=options.iterations??2000,seed=options.seed??1;
 if(!Number.isSafeInteger(iterations)||iterations<1)throw Error('Invalid budget');
 const random=rng(seed);let best=null,score=null;
 if(options.previous){
  const m=validate(p,options.previous);
  best=JSON.parse(JSON.stringify(options.previous));best.metrics=m;
  score=[m.sheets,-m.largestWaste,m.cuts,m.cutLength];
 }
 let rejected=0,lastRejection=null;
 function machineCheck(s){
  const plan=makePlan(p,s,options.profile);
  const result=validateTechnology(p,s,plan,options.profile);
  return {plan,status:result.technology};
 }
 if(best&&options.profile){const checked=machineCheck(best);best.machinePlan=checked.plan;best.technology=checked.status;}
 const start=Date.now(),distribution={};
 for(let i=0;i<iterations;i++){
  const order=jobs.map(j=>({j,key:i===0?-(j.l*j.w):-(j.l*j.w)*(0.15+random()*1.7)})).sort((a,b)=>a.key-b.key).map(x=>x.j);
  const s=trial(p,order,random,i),m=validate(p,s);

  distribution[m.sheets]=(distribution[m.sheets]??0)+1;
  const v=[m.sheets,-m.largestWaste,m.cuts,m.cutLength];
  if(!score||v.some((x,n)=>x<score[n]&&v.slice(0,n).every((y,q)=>y===score[q]))){
   if(options.profile){
    try{const checked=machineCheck(s);s.machinePlan=checked.plan;s.technology=checked.status;}
    catch(e){rejected++;lastRejection=e.message;continue;}
   }
   best=s;score=v;best.metrics=m;
  }
 }
 if(!best)throw Error('No technologically valid layout found in budget: '+lastRejection);
 if(!options.profile){delete best.machinePlan;delete best.technology;delete best.equipmentProfile;}
 best.parameters=JSON.parse(JSON.stringify(p));
 if(options.profile)best.equipmentProfile=JSON.parse(JSON.stringify(options.profile));
 best.search={seed,iterations,states:iterations,pruned:0,technologyRejected:rejected,lastTechnologyRejection:lastRejection,elapsedMs:Date.now()-start,distribution};
 best.validation={valid:true,geometry:{valid:true},technology:best.technology??{valid:null,reason:'No equipment profile supplied'}};
 return best;
}
module.exports={pack,checkInput};
