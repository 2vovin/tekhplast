'use strict';
// Scheduling only: CUT geometry and each blank's rotations are immutable.
// Choose among already detached blanks, respecting every producer dependency.
const clone=x=>JSON.parse(JSON.stringify(x));
const setting=o=>o.axis+':'+(o.axis==='V'?o.start.x:o.start.y);
function schedulePlan(plan,layout,{strategy='settings',lookahead=2,nodeBudget=10000}={}){
 if(!['original','size-desc','size-asc','utilization','settings'].includes(strategy)||!Number.isSafeInteger(lookahead)||lookahead<1||lookahead>4||!Number.isSafeInteger(nodeBudget)||nodeBudget<1)throw Error('Invalid scheduling options');
 const result=clone(plan),ops=[],stats={strategy,lookahead,nodeBudget,solverDepth:0,searchNodes:0,exhausted:false};
 let last=null;
 function append(op){ops.push(clone(op));if(op.type==='cut')last=setting(op);}
 function process(segment){
  if(strategy==='original'){segment.forEach(append);return;}
  const tasks=[],byId=new Map();
  for(const op of segment){
   if(!byId.has(op.inputBlankId)){const task={id:op.inputBlankId,operations:[],index:tasks.length};tasks.push(task);byId.set(task.id,task);}
   byId.get(op.inputBlankId).operations.push(op);
  }
  for(const task of tasks){
   const cut=task.operations.find(o=>o.type==='cut');
   if(!cut)throw Error('Uncut working task unsupported');
   task.cut=cut;task.key=setting(cut);
   const r=cut.materialRect;task.size=Math.max(r.w,r.h);
   // Use the LOAD sheet index, not coordinates shared by different sheets.
   task.kim=0;
   const si=plan.operations.filter(o=>o.type==='load'&&o.step<cut.step).at(-1)?.sheet;
   if(si!==undefined)task.kim=layout.sheets[si].parts.filter(a=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h).reduce((sum,a)=>sum+a.w*a.h,0)/(r.w*r.h||1);
  }
  const producer=new Map();for(const t of tasks)for(const id of t.cut.outputBlankIds)producer.set(id,t.id);
  const done=new Set();
  const ready=d=>tasks.filter(t=>!d.has(t.id)&&(!producer.has(t.id)||d.has(producer.get(t.id))));
  function future(d,prior,depth){
   stats.solverDepth=Math.max(stats.solverDepth,lookahead-depth);
   if(!depth||d.size===tasks.length)return 0;
   if(stats.searchNodes>=nodeBudget){stats.exhausted=true;return 0;}
   let best=Infinity;const options=ready(d).slice().sort((a,b)=>Number(a.key!==prior)-Number(b.key!==prior)||a.index-b.index).slice(0,8);
   for(const t of options){if(stats.searchNodes>=nodeBudget){stats.exhausted=true;break;}stats.searchNodes++;const next=new Set(d);next.add(t.id);best=Math.min(best,Number(t.key!==prior)+future(next,t.key,depth-1));}
   return Number.isFinite(best)?best:0;
  }
  while(done.size<tasks.length){
   const options=ready(done);if(!options.length)throw Error('Cyclic scheduling dependencies');
   options.sort((a,b)=>{
    if(strategy==='size-desc')return b.size-a.size||a.index-b.index;
    if(strategy==='size-asc')return a.size-b.size||a.index-b.index;
    if(strategy==='utilization')return b.kim-a.kim||a.index-b.index;
    return Number(a.key!==last)-Number(b.key!==last)||a.index-b.index;
   });
   let pick=options[0];
   if(strategy==='settings'){
    let best=Infinity,bestTravel=Infinity;
    for(const task of options.slice(0,8)){
     const d=new Set(done);d.add(task.id);
     const cost=Number(task.key!==last)+future(d,task.key,lookahead-1),travel=last?Math.abs(Number(task.key.split(':')[1])-Number(last.split(':')[1])):0;
     if(cost<best||(cost===best&&travel<bestTravel)){pick=task;best=cost;bestTravel=travel;}
    }
   }
   pick.operations.forEach(append);done.add(pick.id);
  }
 }
 let i=0;
 while(i<plan.operations.length){
  while(i<plan.operations.length){const op=plan.operations[i++];append(op);if(op.type==='endPrimary')break;}
  const segment=[];while(i<plan.operations.length&&plan.operations[i].type!=='load')segment.push(plan.operations[i++]);
  process(segment);
 }
 let cut=0;result.operations=ops.map((op,i)=>({...op,step:i+1,...(op.type==='cut'?{cutIndex:++cut}:{})}));
 return {plan:result,search:stats};
}
module.exports={schedulePlan};