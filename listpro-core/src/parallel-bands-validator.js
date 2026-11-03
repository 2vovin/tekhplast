'use strict';
// Independent technology audit: imports only geometry/physical replay, never
// the candidate search or compiler. Roles come from replayed material cuts.
const {replayPhysical}=require('./physical-replay');
function auditPrimary(p,layout,plan,profile){
 const r=replayPhysical(p,layout,plan,profile),errors=[],roles=new Map(),terminal=new Map(),bands=new Map(),closed=new Set(),ancestry=new Map();
 const snapshots=[],partTurns=[];let maximum=0,originalSheetTurns=0;
 const fail=(step,reason)=>errors.push({step,reason});
 const same=(a,b)=>a&&b&&['x','y','w','h'].every(k=>a[k]===b[k]);
 const A=profile.firstCutAxis,v=A==='V',span=z=>v?z.w:z.h,start=z=>v?z.x:z.y,far=p[v?'sheetW':'sheetH'];
 const partById=new Map(plan.outputs.filter(o=>o.kind==='part').map(o=>[JSON.stringify([o.part.id,o.part.instance]),o]));
 for(const e of r.events){
  const o=e.op,b=e.before,id=o.inputBlankId;
  if(o.type==='load'){roles.set(o.blankId,'MAIN');ancestry.set(o.blankId,0);bands.set(o.sheet,[]);continue;}
  if(o.type==='FINAL_REMAINDER_AS_STRIP'){
   if(!b||roles.get(id)!=='MAIN'||b.q!==0||closed.has(b.sheet)||!(bands.get(b.sheet)?.length)) {fail(o.step,'Illegal final-band transition');continue;}
   const witness=partById.get(JSON.stringify([o.witness?.id,o.witness?.instance])),rect=witness?.materialRect;
   const inside=rect&&rect.x>=b.rect.x&&rect.y>=b.rect.y&&rect.x+rect.w<=b.rect.x+b.rect.w&&rect.y+rect.h<=b.rect.y+b.rect.h;
   const border=span(b.rect)-o.nominalSpan;
   if(!inside||span(rect)!==o.nominalSpan||start(rect)!==start(b.rect)||o.primaryAxis!==A||
      start(b.rect)+span(b.rect)!==far||o.edgeAllowance!==border||
      border<p.trim||border>p.trim+(profile.terminalExtraBorderMax??0)||
      !same(o.materialRect,b.rect)||JSON.stringify(o.outputBlankIds)!==JSON.stringify([id])){
    fail(o.step,'Final band lacks a real spanning detail or declared stock-edge allowance');continue;
   }
   terminal.set(id,{nominal:o.nominalSpan,border});roles.set(id,'TERMINAL_PENDING');continue;
  }
  if(o.type==='endPrimary'){
   const expected=bands.get(o.sheet)||[];
   if(JSON.stringify(o.stripBlankIds)!==JSON.stringify(expected)||[...roles].some(([bid,role])=>role==='MAIN'&&r.blanks.find(a=>a.blankId===bid)?.sheet===o.sheet))fail(o.step,'Primary phase not completed');
   closed.add(o.sheet);continue;
  }
  if(!b)continue;
  const role=roles.get(id);
  if(o.type==='rotate'){
   if(role==='MAIN'||role==='TERMINAL_PENDING')originalSheetTurns++;
   if(role==='MAIN'||role==='TERMINAL_PENDING'||role==='TRIM'||!closed.has(b.sheet))fail(o.step,'Rotation of original sheet / main remainder or unfinished primary phase');
   if((r.blanks.find(a=>a.blankId===id)?.turnCount??0)>1)fail(o.step,'Second turn of one physical blank');
   const n=(ancestry.get(id)||0)+1;ancestry.set(id,n);maximum=Math.max(maximum,n);continue;
  }
  if(o.type!=='cut')continue;
  const children=e.materialOutputs,first=children[0],second=children[1];
  roles.delete(id);
  for(const child of children)ancestry.set(child.id,ancestry.get(id)||0);
  if(role==='MAIN'){
   if(b.q!==0||e.materialAxis!==A||closed.has(b.sheet))fail(o.step,'Main remainder changed direction');
   const leadingEdge=start(b.rect)===0&&e.materialPos===p.trim-p.kerf;
   if(leadingEdge){roles.set(first.id,'TRIM');roles.set(second.id,'MAIN');}
   else if(start(b.rect)+span(b.rect)===far&&e.materialPos===far-p.trim){roles.set(first.id,'MAIN');roles.set(second.id,'TRIM');}
   else{
    // A 5-mm needle may not certify liberation of the remaining board.
    if(span(second.rect)<=p.kerf)fail(o.step,'Artificial primary tail no wider than kerf');
    const genuine=layout.sheets[b.sheet].parts.some(a=>span(a)===span(first.rect)&&start(a)===start(first.rect)&&a.x>=first.rect.x&&a.y>=first.rect.y&&a.x+a.w<=first.rect.x+first.rect.w&&a.y+a.h<=first.rect.y+first.rect.h);
    if(!genuine)fail(o.step,'No real spanning detail for this conservative band policy');
    roles.set(first.id,'DETACHED');roles.set(second.id,'MAIN');bands.get(b.sheet).push(first.id);
   }
  }else if(role==='TERMINAL_PENDING'){
   const declared=terminal.get(id);
   if(b.q!==0||e.materialAxis!==A||!declared||span(first.rect)!==declared.nominal||span(second.rect)+p.kerf!==declared.border||o.phase!=='terminal-border')fail(o.step,'Final-band edge trimming mismatch');
   roles.set(first.id,'DETACHED');roles.set(second.id,'TRIM');bands.get(b.sheet).push(first.id);
  }else{
   if(role==='TRIM'||!closed.has(b.sheet))fail(o.step,'Processing waste / strip before completion of primary phase');
   roles.set(first.id,'SECONDARY');roles.set(second.id,'SECONDARY');
  }
  snapshots.push({step:o.step,cut:o.cutIndex,input:id,inputRole:role,outputs:children.map(c=>({...c,role:roles.get(c.id)}))});
 }
 for(const [id,role]of roles)if(role==='MAIN'||role==='TERMINAL_PENDING')fail(plan.operations.length,'Unfinished primary remainder '+id);
 const covered=new Set();
 for(const group of plan.groups??[]){
  let current=group.rootBlankId,last=0;const children=[];
  for(const step of group.cutSteps){
   const e=r.events.find(a=>a.op.step===step);
   if(!e||e.kind!=='cut'||e.op.phase!=='layout'||e.op.inputBlankId!==current||e.materialAxis!==group.axis||step<=last||covered.has(step)){fail(step,'Invalid parallel strip series');continue;}
   covered.add(step);children.push(e.materialOutputs[0].id);current=e.materialOutputs[1].id;last=step;
  }
  children.push(current);
  if(JSON.stringify(children)!==JSON.stringify(group.children))fail(last,'Group output identities');
  const consumed=new Set(group.cutSteps.map(step=>plan.operations[step-1]?.inputBlankId));
  for(const e of r.events)if(e.op.step<last&&children.includes(e.op.inputBlankId)&&!consumed.has(e.op.inputBlankId)&&['rotate','cut'].includes(e.op.type))fail(e.op.step,'Child processed before parallel series completed');
 }
 for(const o of plan.operations)if(o.type==='cut'&&o.phase==='layout'&&!covered.has(o.step))fail(o.step,'Ungrouped layout cut');
 for(const o of plan.outputs)if(o.kind==='part')partTurns.push({part:o.part,turns:ancestry.get(o.blankId)||0});
 return {geometryValid:true,abstractCutTreeValid:true,targetPSSModelValid:errors.length===0,
  realMachineFeasibility:'unknown',profileId:profile.id,errors,
  limitations:['Machine feeding, clamps, stroke and hold dimensions are unspecified.',
   'Conservative candidate profile: real spanning detail for every primary band; not a universal BAZIS restriction.',
   'Explicit terminal band at stock edge, with declared border removal before any rotation.'],
  metrics:{...r.metrics,ancestryTurnsMax:Math.max(0,...partTurns.map(a=>a.turns)),originalSheetTurns},
  partTurns,primarySnapshots:snapshots.filter(a=>['MAIN','TERMINAL_PENDING'].includes(a.inputRole))};
}
function validateBands(p,layout,plan,profile){
 const report=auditPrimary(p,layout,plan,profile);
 if(!report.targetPSSModelValid)throw Error('Band technology: '+report.errors.map(a=>a.step+': '+a.reason).join('; '));
 return report;
}
module.exports={auditPrimary,validateBands};
