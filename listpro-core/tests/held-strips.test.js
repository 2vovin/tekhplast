'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditHeld,validateHeld}=require('../src/held-strip-validator');
const {makeHeldPlan}=require('../src/held-strip-plan');
const {searchHeldStrips,heldTree}=require('../src/held-strip-search');
const {artifacts}=require('../src/held-strip-artifacts');
const {replayPhysical}=require('../src/physical-replay');
const saved=require('../benchmarks/held-strips/result.json');
const old=require('../benchmarks/parallel-bands/result.json');
const order=require('../benchmarks/bazis-26-corrected.json');
const clone=a=>JSON.parse(JSON.stringify(a));
const audit=s=>auditHeld(s.parameters,s,s.plan,s.equipmentProfile);
const check=s=>validateHeld(s.parameters,s,s.plan,s.equipmentProfile);
test('held strips: all 26 unchanged instances, one sheet, 47 cuts, 12 turns',()=>{
 assert.deepEqual(saved.parameters,order);
 const r=check(saved);
 assert.equal(r.metrics.parts,26);assert.equal(r.metrics.sheets,1);
 assert.equal(r.metrics.cuts,47);assert.equal(r.metrics.turns,12);
 assert.equal(r.metrics.heldRemainderTurns,0);assert.equal(r.metrics.originalSheetTurns,0);
 assert.equal(r.metrics.ancestryTurnsMax,3);
 assert.equal(r.realMachineFeasibility,'unknown');assert.ok(saved.sheets[0].parts.every(a=>!a.rotated));
});
test('step 78 regression: old 1334x719 retained strip cannot rotate',()=>{
 const s=clone(old);s.equipmentProfile.retainedSide='HIGH_MATERIAL';
 const r=audit(s),e=r.errors.find(e=>e.step===78&&e.code==='HELD_REMAINDER_ROTATION');
 assert.ok(e);assert.deepEqual(e.detail.rect,{x:1406,y:1091,w:1334,h:719});
 assert.equal(r.geometryValid,true);assert.equal(r.abstractCutTreeValid,true);
 assert.equal(r.targetPSSModelValid,false);
 assert.ok(r.errors.some(e=>e.code==='TREE_RETAINED_AXIS_CHANGE'));
});
test('compiler cannot silently rotate old retained substrip',()=>{
 assert.throws(()=>makeHeldPlan(old.parameters,old,saved.equipmentProfile),/Retained blank cannot rotate/);
});
test('old full-height X1703 cut hits instances 4:2 and 10:1',()=>{
 const hits=old.sheets[0].parts.filter(a=>a.x<1708&&a.x+a.w>1703&&a.y<1810&&a.y+a.h>1091);
 assert.deepEqual(hits.map(a=>a.id+':'+a.instance),['4:2','10:1']);
});
test('at every ordinary cut only LOW side is detached; retained ID inherits lock',()=>{
 const r=check(saved);
 for(const f of r.roleFrames){
  const op=saved.plan.operations[f.step-1];
  if(op.phase==='strip-trim'||f.cut===1)continue;
  assert.equal(f.outputs[0].role,'DETACHED');assert.equal(f.outputs[0].held,false);
  assert.equal(f.outputs[1].held,true);
 }
 assert.ok(r.roleFrames.some(f=>f.inputRole==='HELD_STRIP'));
});
test('edge preparation preserves holding; last primary tail stays waste',()=>{
 const r=check(saved);
 assert.equal(r.primarySnapshots[0].outputs[0].role,'TRIM');
 assert.equal(r.primarySnapshots[0].outputs[1].held,true);
 const last=r.primarySnapshots.at(-1);
 assert.equal(last.outputs[1].rect.h,15);assert.equal(last.outputs[1].role,'HELD_SHEET');
 assert.ok(!saved.plan.operations.some(o=>o.type==='FINAL_REMAINDER_AS_STRIP'));
});
test('held feed cannot be labelled as unloading/reloading',()=>{
 const s=clone(saved);s.plan.operations.find(o=>o.feedMode==='advance-in-place').feedMode='load-detached';
 assert.ok(audit(s).errors.some(e=>e.code==='FEED_MODE'));
});
test('interior rip cannot be disguised as edge trim',()=>{
 const s=clone(saved);s.plan.operations.find(o=>o.type==='cut'&&o.phase==='layout').phase='strip-trim';
 assert.ok(audit(s).errors.some(e=>e.code==='FAKE_EDGE_TRIM'));
});
test('renaming IDs and injecting detached roles does not free the old remainder',()=>{
 const s=clone(old);s.equipmentProfile.retainedSide='HIGH_MATERIAL';
 s.plan=JSON.parse(JSON.stringify(s.plan).split('s0/band4/work/1/1').join('free-looking-piece'));
 s.plan.operations.find(o=>o.step===78).role='DETACHED';
 assert.ok(audit(s).errors.some(e=>e.step===78&&e.code==='HELD_REMAINDER_ROTATION'));
});
test('endPrimary does not promote a retained tail',()=>{
 const s=clone(saved);s.plan.operations.find(o=>o.type==='endPrimary').remainderBlankId='s0/band4';
 assert.ok(audit(s).errors.some(e=>e.code==='PRIMARY_TAIL_NOT_DECLARED'));
});
test('malformed kerf and duplicate physical IDs are rejected independently',()=>{
 let s=clone(saved);s.plan.operations.find(o=>o.type==='cut').kerf=0;assert.throws(()=>check(s),/kerf/);
 s=clone(saved);s.plan.operations.find(o=>o.type==='cut').outputBlankIds=['same','same'];assert.throws(()=>check(s),/outputs/);
});
test('machine stroke and one-turn constraints are effective',()=>{
 let s=clone(saved);s.equipmentProfile.maxCutLength=2000;assert.throws(()=>check(s),/stroke/);
 s=clone(saved);s.equipmentProfile.maxTurnsPerBlank=0;assert.throws(()=>check(s),/SECOND_PHYSICAL_ROTATION/);
});
test('1000-wide substrip is cut out before any of its row cuts',()=>{
 const r=replayPhysical(saved.parameters,saved,saved.plan,saved.equipmentProfile);
 const detach=r.events.find(e=>e.kind==='cut'&&e.materialOutputs.some(c=>c.rect.x===981&&c.rect.w===1000&&c.rect.h===719));
 assert.ok(detach);
 const rows=r.events.filter(e=>e.kind==='cut'&&e.before.rect.x===981&&e.before.rect.w===1000&&e.materialAxis==='H');
 assert.equal(rows.length,3);assert.ok(rows.every(e=>e.op.step>detach.op.step));
 assert.equal(saved.sheets[0].parts.find(a=>a.id===4&&a.instance===5).x,2377);
});
for(const axis of ['H','V'])test('small order supports initial '+axis+' rip without rotating sheet',()=>{
 const p={...order,sheetW:600,sheetH:600,pieces:[{id:1,l:180,w:100,q:6,grain:true}]};
 const profile={...saved.equipmentProfile,firstCutAxis:axis,machineCutAxes:[axis]};
 const bands=axis==='H'?[[100,100]]:[[180,180]];
 const s=searchHeldStrips(p,{seed:42,iterations:50,bandSets:bands,axis}).best;
 const plan=makeHeldPlan(p,s,profile),r=validateHeld(p,s,plan,profile);
 assert.equal(r.metrics.parts,6);assert.equal(r.metrics.originalSheetTurns,0);assert.ok(heldTree(s));
});
test('artifacts include every real CUT and held/detached child roles',()=>{
 const a=artifacts(saved);assert.equal(Object.keys(a).filter(p=>p.startsWith('roles/')).length,47);
 assert.equal(Object.keys(a).filter(p=>p.startsWith('cuts/')).length,47);
 assert.ok(a['operations.md'].includes('advance-in-place'));
 assert.ok(a['roles/cut-008.svg'].includes('HELD_STRIP'));
});

test('a detached band cannot interrupt an unfinished retained rip series',()=>{
 const s=clone(saved),feed=clone(s.plan.operations.find(o=>o.type==='feed'&&o.inputBlankId==='s0/band1'));
 s.plan.operations.splice(4,0,feed);s.plan.operations.forEach((o,i)=>o.step=i+1);
 assert.ok(audit(s).errors.some(e=>e.code==='UNFINISHED_RIP_SERIES'));
});
test('unsupported retained-side policy cannot silently use the high-side validator',()=>{
 const s=clone(saved);s.equipmentProfile.retainedSide='LOW_MATERIAL';
 assert.throws(()=>check(s),/Unsupported retained side/);
});

test('20 varied orders replay with each initial direction and preserve instance counts',()=>{
 for(let seed=1;seed<=20;seed++)for(const axis of ['H','V']){
  const l=170+seed%11,w=100+(seed*7)%11,p={...order,sheetW:600,sheetH:600,pieces:[{id:1,l,w,q:6,grain:true}]};
  const profile={...saved.equipmentProfile,firstCutAxis:axis,machineCutAxes:[axis]};
  const s=searchHeldStrips(p,{seed,iterations:12,axis,bandSets:[[axis==='H'?w:l,axis==='H'?w:l]]}).best;
  const r=validateHeld(p,s,makeHeldPlan(p,s,profile),profile);
  assert.equal(r.metrics.parts,6);assert.equal(r.metrics.sheets,1);assert.equal(r.metrics.heldRemainderTurns,0);
 }
});
