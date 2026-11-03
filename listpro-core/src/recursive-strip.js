'use strict';
// Independent Brain 2.0 search; no previous PSS optimizer is imported.
// Material coordinates never rotate. A physical rotation is compiled separately.
const {checkInput}=require('./core');
const {validate}=require('./validator');
const {makeExamPlan}=require('./exam-plan');
const {validateRecursive}=require('./recursive-strip-validator');
const {collect}=require('./pss-waste-local');
const clone=x=>JSON.parse(JSON.stringify(x));
const key=j=>JSON.stringify([j.id,j.instance]);
function random(seed){let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function families(jobs){
 const m=new Map();
 for(const j of jobs){const k=JSON.stringify([j.l,j.w,j.grain!==false,j.texture??null]);if(!m.has(k))m.set(k,[]);m.get(k).push(j);}
 return [...m.values()];
}
// Exact 0/1 knapsack on the supplied finite list. No rounding of millimetres.
// Kerfs consume capacity between selected items; a nonzero end gap needs a cut.
function linearDP(items,capacity,kerf,maxStates=20000){
 let exact=true;
 let states=new Map([[0,{value:0,items:[]}]]);
 for(const item of items){
  const next=new Map(states);
  for(const [used,s] of states){
   const n=used+item.length+kerf;if(n>capacity+kerf)continue;
   const v=s.value+item.value;
   if(!next.has(n)||v>next.get(n).value)next.set(n,{value:v,items:[...s.items,item]});
  }
  if(next.size>maxStates){exact=false;states=new Map([...next].sort((a,b)=>b[1].value-a[1].value).slice(0,maxStates-1));states.set(0,{value:0,items:[]});}else states=next;
 }
 let best={value:0,items:[]},used=0;
 for(const [n,s] of states)if(n===capacity+kerf||n<=capacity){if(s.value>best.value){best=s;used=n;}}
 return {...best,used:used?used-kerf:0,states:states.size,exact};
}
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
 function fill(r,depth=0){
  stats.rectangles++;
  if(!r.w||!r.h||!left.size)return waste(r);
  const orientations=[];
  for(const j of left.values()){
   if(fit(r.w,j.l)&&fit(r.h,j.w))orientations.push({j,w:j.l,h:j.w,rotated:false});
   if(j.grain===false&&j.l!==j.w&&fit(r.w,j.w)&&fit(r.h,j.l))orientations.push({j,w:j.w,h:j.l,rotated:true});
  }
  if(!orientations.length)return waste(r);
  // Seeded candidate family and direction. delta affects membership, never dimensions.
  const axis=rng()<config.vertical?'V':'H',v=axis==='V';
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
   if(index===selected.length)return fill(rr,depth+1);
   const o=selected[index].o,sz=v?o.h:o.w;
   return divide(rr,v?'H':'V',sz,cell=>
    divide(cell,axis,v?o.w:o.h,part=>({kind:'part',rect:{...part},part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}}),slack=>fill(slack,depth+1)),
    tail=>line(tail,index+1));
  }
  return divide(r,axis,thick,strip=>line(strip,0),rest=>fill(rest,depth+1));
 }
 const sheets=[];
 while(left.size){
  const before=left.size, widths=[];
  // Primary candidates: dimension widths, 1D compositions, and a wide physically
  // detached strip. The final positive residue is never turned or promoted.
  let capacity=W;
  if(config.primary===3){
   const groups=families([...left.values()]);
   const candidates=groups.map(g=>({length:g[0].l,value:Math.min(g.length,Math.floor((H+k)/(g[0].w+k)))*g[0].l*g[0].w})).filter(a=>a.length+k<capacity);
   const d=linearDP(candidates,Math.max(0,W-3*k-Math.max(1,k)),k);
   for(const a of d.items){widths.push(a.length);capacity-=a.length+k;}
   stats.primaryDP++;
  }else if(config.primary!==0){
   const dims=[...new Set([...left.values()].flatMap(j=>j.grain===false?[j.l,j.w]:[j.l]))].filter(w=>w+k+Math.max(1,k)<W);
   if(dims.length){
    const a=dims[Math.floor(rng()*dims.length)];
    widths.push(a);capacity-=a+k;
    if(config.primary===2){
     const b=dims[Math.floor(rng()*dims.length)];
     if(b+k+Math.max(1,k)<capacity){widths.push(b);capacity-=b+k;}
    }
   }
  }
  const final=capacity-k-Math.max(1,k);
  if(final>0)widths.push(final);
  let r={x:p.trim,y:p.trim,w:W,h:H},path='r';const primaryStrips=[];
  function compose(i,rect,path){
   if(i===widths.length){primaryStrips.push({index:i+1,rect:{...rect},path});return waste(rect);}
   const w=widths[i],strip={...rect,w};
   primaryStrips.push({index:i+1,rect:strip,path:path+'/0'});
   return divide(rect,'V',w,rr=>fill(rr),rr=>compose(i+1,rr,path+'/1'));
  }
  const tree=compose(0,r,path);sheets.push({tree,primaryStrips});
  if(left.size===before)return null; // Unsupported width/reservation, not infeasibility.
 }
 return collect({sheets,method:'recursive-strip-brain-2.0',optimality:'not proven'});
}
function vector(s){const m=s.verification.metrics;return [m.sheets,-m.largestWaste,m.cuts,m.turns,m.operations,m.cutLength];}
function lex(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]-b[i];}return 0;}
function dominates(a,b){return a.every((x,i)=>x<=b[i])&&a.some((x,i)=>x<b[i]);}
function searchRecursive(p,profile,options={}){
 const {jobs,w,h}=checkInput(p);
 if(!jobs.length)throw Error('Empty order');
 if(![p.sheetW,p.sheetH,p.kerf,p.trim,...jobs.flatMap(j=>[j.l,j.w])].every(Number.isSafeInteger))throw Error('Brain 2.0 requires integer millimetres');
 if(p.kerf<1||(p.trim>0&&p.trim<p.kerf))throw Error('Unsupported kerf/trim combination');
 const iterations=options.iterations??3000,seed=options.seed??2026,deltas=options.deltas??[0,0.05,0.1,0.2,0.5,0.99];
 if(!Number.isSafeInteger(iterations)||iterations<1||!Number.isSafeInteger(seed)||!deltas.length||deltas.some(d=>!Number.isFinite(d)||d<0||d>=1))throw Error('Invalid search options');
 if(profile?.id!=='abstract-staged-detached-strips-exam-v1'||profile.mode!=='PANEL_SAW_STAGED'||profile.firstCutAxis!=='V')throw Error('Explicit detached-strip staged profile required');
 const rng=random(seed),started=Date.now(),stats={seed,iterations,rectangles:0,dpCalls:0,dpStates:0,prunedDP:0,primaryDP:0,validated:0,failedTrials:0,byDelta:{},areaLowerBound:Math.ceil(jobs.reduce((s,j)=>s+j.l*j.w,0)/(w*h))};
 let best=null,pareto=[];
 if(options.previous){
  const prior=clone(options.previous);prior.verification=validateRecursive(p,prior,prior.plan,profile);
  prior.metrics=prior.verification.metrics;prior.parameters=clone(p);prior.equipmentProfile=clone(profile);
  best=prior;pareto=[prior];stats.resumed=true;
 }
 for(let i=0;i<iterations;i++){
  const delta=deltas[i%deltas.length],config={delta,dp:i%5===0,vertical:(i%7)/6,choices:1+(i%3),reverse:i%2===0,primary:i%20===19?3:i%4===0?0:i%4===1?2:1};
  const s=trial(p,jobs,config,rng,stats);
  if(!s){stats.failedTrials++;continue;}
  const g=validate(p,s),d=stats.byDelta[delta]??={trials:0,minSheets:Infinity,minGeometryCuts:Infinity};d.trials++;if(g.sheets<d.minSheets){d.minSheets=g.sheets;d.minGeometryCuts=g.cuts;}else if(g.sheets===d.minSheets)d.minGeometryCuts=Math.min(d.minGeometryCuts,g.cuts);
  if(best&&g.sheets>best.sheets.length)continue;
  const plan=makeExamPlan(p,s,profile),verification=validateRecursive(p,s,plan,profile);stats.validated++;
  verification.abstractCutPlanValid=verification.abstractStagedValid;
  const result={...s,parameters:clone(p),equipmentProfile:clone(profile),plan,verification,metrics:verification.metrics,configuration:config};
  const score=vector(result);
  if(best&&g.sheets<best.sheets.length)pareto=[];
  if(!pareto.some(a=>lex(vector(a),score)===0||dominates(vector(a),score))){
   pareto=pareto.filter(a=>!dominates(score,vector(a)));pareto.push(result);
  }
  if(!best||lex(score,vector(best))<0){best=result;if(options.onBest)options.onBest(clone(result));}
 }
 if(!best)throw Error('No result found within the supported primary reservation/budget; infeasibility not proven');
 stats.elapsedMs=Date.now()-started;
 best.search=stats;
 return {best,pareto:pareto.sort((a,b)=>lex(vector(a),vector(b))),search:stats};
}
module.exports={searchRecursive,linearDP,families,trial,random,vector};
