'use strict';
const {checkInput}=require('./core');
const {validate}=require('./validator');
const {collect}=require('./pss-waste-local');
const {linearDP,families,random}=require('./recursive-strip');
const key=j=>JSON.stringify([j.id,j.instance]);
function trial(p,jobs,config,rng,stats){
 const k=p.kerf,W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim;
 const left=new Map(jobs.map(j=>[key(j),j]));
 const priority=new Map(families(jobs).flatMap(group=>{const v=0.15+2*rng();return group.map(j=>[key(j),v]);}));
 const waste=r=>({kind:'waste',rect:{...r}});
 const fit=(span,size)=>size<=span&&(span===size||span-size>=k);
 function divide(r,axis,size,a,b){
  const v=axis==='V',span=v?r.w:r.h;
  if(size===span)return a(r);
  const pos=(v?r.x:r.y)+size,ra=v?{...r,w:size}:{...r,h:size};
  const rb=v?{...r,x:pos+k,w:span-size-k}:{...r,y:pos+k,h:span-size-k};
  return {kind:'cut',rect:{...r},axis,pos,kerf:k,first:a(ra),second:b(rb)};
 }
 function fill(r,depth=0,forced=null){
  stats.rectangles++;
  if(!r.w||!r.h||!left.size)return waste(r);
  const orientations=[];
  for(const j of left.values()){
   if(fit(r.w,j.l)&&fit(r.h,j.w))orientations.push({j,w:j.l,h:j.w,rotated:false});
   if(j.grain===false&&j.l!==j.w&&fit(r.w,j.w)&&fit(r.h,j.l))orientations.push({j,w:j.w,h:j.l,rotated:true});
  }
  if(!orientations.length)return waste(r);
  // Seeded candidate family and direction. delta affects membership, never dimensions.
  const chosen=rng()<config.vertical?'V':'H',axis=forced??chosen,v=axis==='V';
  orientations.sort((a,b)=>b.w*b.h*priority.get(key(b.j))-a.w*a.h*priority.get(key(a.j)));
  const anchor=orientations[Math.min(orientations.length-1,Math.floor(rng()*config.choices))];
  const thick=v?anchor.w:anchor.h,cap=v?r.h:r.w;
  let eligible=orientations.filter(o=>{
   const t=v?o.w:o.h;return t>=thick*(1-config.delta)&&fit(thick,t);
  });
  // Each physical instance may enter the linear subproblem only once.
  const used=new Set();eligible=eligible.filter(o=>{const id=key(o.j);if(used.has(id))return false;used.add(id);return true;});
  const items=eligible.map(o=>({o,length:v?o.h:o.w,value:o.w*o.h*priority.get(key(o.j))}));
  let selected;
  if(config.dp&&items.length<=64){
   const d=linearDP(items,cap,k);selected=d.items;stats.dpCalls++;stats.dpStates+=d.states;if(!d.exact)stats.prunedDP++;
  }else{
   selected=[];let length=0;
   for(const it of items){const n=length+it.length+(selected.length?k:0);if(n<=cap&&(n===cap||cap-n>=k)){selected.push(it);length=n;}}
  }
  if(!selected.length)selected=[items.find(i=>key(i.o.j)===key(anchor.j))||items[0]];
  selected.sort((a,b)=>config.reverse?a.length-b.length:b.length-a.length);
  for(const it of selected)left.delete(key(it.o.j));
  function line(rr,index){
   if(index===selected.length)return fill(rr,depth+1,v?'H':'V');
   const o=selected[index].o,sz=v?o.h:o.w;
   return divide(rr,v?'H':'V',sz,cell=>
    divide(cell,axis,v?o.w:o.h,part=>({kind:'part',rect:{...part},part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}}),slack=>fill(slack,depth+1,axis)),
    tail=>line(tail,index+1));
  }
  return divide(r,axis,thick,strip=>line(strip,0),rest=>fill(rest,depth+1,axis));
 }

 // Trial each strip against an independent structural predicate before committing inventory.
 function feasible(n){
  if(n.kind!=='cut')return true;
  // A terminal branch may start a new rip only after explicit completion; replay decides.
  const v=n.axis==='V',r=n.first.rect;
  let count=0,witness=false;
  function scan(t){if(t.kind==='part'){count++;if((v?t.rect.w:t.rect.h)===(v?r.w:r.h))witness=true;}
   else if(t.kind==='cut'){scan(t.first);scan(t.second);}}
  scan(n.first);
  return (!count||witness)&&feasible(n.first)&&feasible(n.second);
 }
 function area(n){return n.kind==='part'?n.rect.w*n.rect.h:n.kind==='cut'?area(n.first)+area(n.second):0;}
 const sheets=[];
 while(left.size){
  const before=left.size,primaryStrips=[];let path='r';
  function compose(r){
   const snapshot=new Map(left);
   let dims=[...new Set([...left.values()].flatMap(j=>j.grain===false?[j.w,j.l]:[j.w]))].filter(h=>h+k<=r.h);
   dims.sort((a,b)=>b-a);
   if(dims.length>config.candidates){
    const mandatory=dims[0],sample=dims.map(h=>({h,z:rng()})).sort((a,b)=>a.z-b.z).slice(0,config.candidates-1).map(a=>a.h);
    dims=[mandatory,...sample.filter(h=>h!==mandatory)];
   }
   let best=null;
   for(const h of dims){
    left.clear();for(const [id,j]of snapshot)left.set(id,j);
    const band={...r,h},tree=fill(band,0,'V');
    if(left.size===snapshot.size||!feasible(tree)){stats.rejectedBands++;continue;}
    let witness=false;
    function scan(n){if(n.kind==='part'&&n.rect.h===h)witness=true;if(n.kind==='cut'){scan(n.first);scan(n.second);}}scan(tree);
    if(!witness){stats.rejectedBands++;continue;}
    const used=area(tree),density=used/(r.w*(h+k));
    const weighted=used/(Math.pow(h+k,config.heightPower)*r.w);
    const score=weighted*(1+config.noise*rng());
    if(!best||score>best.score)best={h,tree,remaining:new Map(left),score,density};
   }
   left.clear();for(const [id,j]of snapshot)left.set(id,j);
   if(!best){
    // Guaranteed simple real-dimension band; never rotate a retained tail.
    const choices=[...left.values()].flatMap(j=>[{j,w:j.l,h:j.w,rotated:false},...(j.grain===false?[{j,w:j.w,h:j.l,rotated:true}]:[])])
      .filter(o=>o.h+k<=r.h&&o.w+k<=r.w).sort((a,b)=>b.w*b.h-a.w*a.h);
    if(choices.length){
     const o=choices[0],band={...r,h:o.h};left.delete(key(o.j));
     const tree=divide(band,'V',o.w,rr=>({kind:'part',rect:rr,part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}}),waste);
     best={h:o.h,tree,remaining:new Map(left)};stats.fallbackBands++;
    }
   }
   if(!best){primaryStrips.push({index:primaryStrips.length+1,rect:{...r},path});return waste(r);}
   left.clear();for(const [id,j]of best.remaining)left.set(id,j);
   primaryStrips.push({index:primaryStrips.length+1,rect:{...r,h:best.h},path:path+'/0'});
   const savedPath=path;path+='/1';
   return divide(r,'H',best.h,()=>best.tree,rr=>compose(rr));
  }
  const tree=compose({x:p.trim,y:p.trim,w:W,h:H});sheets.push({tree,primaryStrips,axis:'H'});
  if(before===left.size)throw Error('No fitting detached strip; no infeasibility proof');
 }
 return collect({sheets,method:'adaptive-held-strip-multistart',optimality:'not proven'});
}
function transpose(s){
 function rect(r){return{x:r.y,y:r.x,w:r.h,h:r.w};}
 for(const sh of s.sheets){
  function walk(n){n.rect=rect(n.rect);if(n.kind==='cut'){n.axis=n.axis==='H'?'V':'H';walk(n.first);walk(n.second);}}
  walk(sh.tree);sh.primaryStrips.forEach(b=>b.rect=rect(b.rect));sh.axis='V';
 }return collect(s);
}
function searchAdaptive(p,{iterations=100,seed=42,axis='H',accept,candidates=12,shouldStop=()=>false}={}){
 if(!['H','V'].includes(axis)||!Number.isSafeInteger(iterations)||iterations<1||!Number.isSafeInteger(seed)||!Number.isSafeInteger(candidates)||candidates<1)throw Error('Search options');
 const pp=axis==='H'?p:{...p,sheetW:p.sheetH,sheetH:p.sheetW,pieces:p.pieces.map(j=>({...j,l:j.w,w:j.l}))};
 const jobs=checkInput(pp).jobs,rng=random(seed),stats={iterations,seed,axis,rectangles:0,dpCalls:0,dpStates:0,prunedDP:0,rejectedBands:0,fallbackBands:0,accepted:0,rejected:0,distribution:{},elapsedMs:0};
 let best=null,score=null;const start=Date.now();
 for(let i=0;i<iterations;i++){
  if(shouldStop()){stats.budgetExhausted=true;break;}
  const config={delta:[0,.2,.5,.99][i%4],dp:i%3===0,vertical:(i%7)/6,choices:1+i%2,reverse:!!(i%2),candidates,heightPower:[1,.95,.85,.7][i%4],noise:i===0?0:.05};
  let s=trial(pp,jobs,config,rng,stats);if(axis==='V')s=transpose(s);
  const g=validate(p,s),v=[g.sheets,g.cuts,-g.largestWaste,g.cutLength];
  stats.distribution[g.sheets]=(stats.distribution[g.sheets]||0)+1;
  if(!score||v.some((x,j)=>x<score[j]&&v.slice(0,j).every((z,k)=>z===score[k]))){
   if(accept&&!accept(s)){stats.rejected++;continue;}
   stats.accepted++;best=s;score=v;best.searchCandidate={iteration:i,config,axis,seed};
  }
 }
 if(!best)throw Error('No technologically accepted candidate');
 stats.elapsedMs=Date.now()-start;return {best,stats};
}

function repackAdaptive(p,layout,{sheetIndices,iterations=100,seed=42,axis='H',accept,candidates=12}={}){
 if(!Array.isArray(sheetIndices)||new Set(sheetIndices).size!==sheetIndices.length||sheetIndices.some(i=>!Number.isInteger(i)||i<0||i>=layout.sheets.length))throw Error('Invalid sheet neighborhood');
 const chosen=new Set(sheetIndices),instances=sheetIndices.flatMap(i=>layout.sheets[i].parts.map(a=>({id:a.id,instance:a.instance})));
 const sub={...p,pieces:instances.map((a,i)=>({...p.pieces.find(j=>j.id===a.id),id:i+1,q:1}))};
 function merge(s){
  const copy=JSON.parse(JSON.stringify(s));
  function walk(n){if(n.kind==='part'){const a=instances[n.part.id-1];n.part.id=a.id;n.part.instance=a.instance;}
   else if(n.kind==='cut'){walk(n.first);walk(n.second);}}
  copy.sheets.forEach(sh=>walk(sh.tree));
  const joined=collect({sheets:[...layout.sheets.filter((_,i)=>!chosen.has(i)).map(sh=>JSON.parse(JSON.stringify(sh))),...copy.sheets],method:'adaptive-held-strip-neighborhood',optimality:'not proven'});
  validate(p,joined);return joined;
 }
 const found=searchAdaptive(sub,{iterations,seed,axis,candidates,accept:s=>!accept||accept(merge(s))});
 return {best:merge(found.best),stats:{...found.stats,removedSheets:sheetIndices,removedParts:instances.length,oldSheetCount:layout.sheets.length,newSheetCount:layout.sheets.length-sheetIndices.length+found.best.sheets.length}};
}
module.exports={searchAdaptive,repackAdaptive};
