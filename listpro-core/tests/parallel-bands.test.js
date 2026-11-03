'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateBands,auditPrimary}=require('../src/parallel-bands-validator');
const {makeBandPlan}=require('../src/parallel-bands-plan');
const {searchBands}=require('../src/parallel-bands-search');
const saved=require('../benchmarks/parallel-bands/result.json');
const clone=a=>JSON.parse(JSON.stringify(a));
const audit=s=>validateBands(s.parameters,s,s.plan,s.equipmentProfile);
test('26 original instances: 46 real cuts, 12 turns, no sheet rotation',()=>{
 const r=audit(saved);assert.equal(r.metrics.parts,26);assert.equal(r.metrics.sheets,1);assert.equal(r.metrics.cuts,46);assert.equal(r.metrics.turns,12);assert.equal(r.metrics.ancestryTurnsMax,3);assert.equal(r.realMachineFeasibility,'unknown');
 assert.equal(saved.parameters.pieces.find(p=>p.id===4).q,5);
 assert.equal(saved.plan.operations.filter(o=>o.type==='rotate'&&o.inputBlankId.includes('/main')).length,0);
});
test('first rip has one detached band and one main remainder',()=>{
 const r=audit(saved),x=r.primarySnapshots.find(a=>a.cut===2);
 assert.deepEqual(x.outputs.map(a=>a.role),['DETACHED','MAIN']);assert.equal(x.outputs[1].rect.h,1417);
});
test('real 5-mm leading edge waste is allowed; no needle remainder liberation',()=>{
 const r=audit(saved);assert.equal(r.primarySnapshots[0].outputs[0].rect.h,5);assert.equal(r.primarySnapshots[0].outputs[0].role,'TRIM');
 const last=r.primarySnapshots.at(-1);assert.equal(last.inputRole,'TERMINAL_PENDING');assert.equal(last.outputs[1].rect.h,15);
});
for(const mode of ['4','unlimited'])test('historical '+mode+' needle strategy rejected, old fixture preserved',()=>{
 const s=require('../benchmarks/brain21/'+mode+'/result.json'),r=auditPrimary(s.parameters,s,s.plan,s.equipmentProfile);
 assert.equal(r.geometryValid,true);assert.equal(r.targetPSSModelValid,false);
 assert.ok(r.errors.some(e=>e.reason.includes('Artificial primary tail')));
 if(mode==='4'){const x=r.primarySnapshots.find(e=>e.cut===3);assert.equal(x.outputs[1].role,'MAIN');assert.equal(x.outputs[1].rect.w,976);}
});
test('terminal band cannot be declared without a genuine spanning detail',()=>{
 const s=clone(saved);s.plan.operations.find(o=>o.type==='FINAL_REMAINDER_AS_STRIP').witness={id:4,instance:1};assert.throws(()=>audit(s),/spanning detail/);
});
test('endPrimary alone does not release the last board',()=>{
 const s=clone(saved);s.plan.operations=s.plan.operations.filter(o=>o.type!=='FINAL_REMAINDER_AS_STRIP');
 const mapping=new Map();s.plan.operations.forEach((o,i)=>{mapping.set(o.step,i+1);o.step=i+1;});
 s.plan.groups.forEach(g=>g.cutSteps=g.cutSteps.map(s=>mapping.get(s)));assert.throws(()=>audit(s),/Primary phase|Unfinished/);
});
test('terminal extra border is explicit, not a hidden machining allowance',()=>{
 const s=clone(saved);s.equipmentProfile.terminalExtraBorderMax=0;assert.throws(()=>audit(s),/allowance/);
});
test('fake semantic blank names cannot bypass ancestry and primary-role audit',()=>{
 const s=clone(saved),map=new Map();let n=0;
 function replace(v){if(typeof v==='string'&&v.startsWith('s0/')){if(!map.has(v))map.set(v,'arbitrary-'+(++n));return map.get(v);}
  if(Array.isArray(v))return v.map(replace);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,a])=>[k,replace(a)]));return v;}
 s.plan=replace(s.plan);assert.equal(audit(s).targetPSSModelValid,true);
});
test('declared parallel groups must match actual cuts and child identities',()=>{
 const s=clone(saved);s.plan.groups[0].children.reverse();assert.throws(()=>audit(s),/Group output/);
});
test('a line extended beyond its current blank is rejected',()=>{
 const s=clone(saved),o=s.plan.operations.find(o=>o.type==='cut'&&o.phase==='layout');o.end.x+=1;assert.throws(()=>audit(s),/bounds/);
});
test('unknown stroke is not an assertion of machine compatibility',()=>{
 const s=clone(saved);s.equipmentProfile.maxCutLength=1000;assert.throws(()=>audit(s),/stroke|envelope/);
});
test('same technology can start on the other material axis without sheet rotation',()=>{
 const s=clone(saved),p=s.parameters;[p.sheetW,p.sheetH]=[p.sheetH,p.sheetW];p.pieces.forEach(a=>{[a.l,a.w]=[a.w,a.l];});
 const rect=r=>({x:r.y,y:r.x,w:r.h,h:r.w});
 for(const sh of s.sheets){function tree(n){n.rect=rect(n.rect);if(n.kind==='cut'){n.axis=n.axis==='V'?'H':'V';tree(n.first);tree(n.second);}}tree(sh.tree);
  sh.parts=sh.parts.map(a=>({...a,...rect(a)}));sh.primaryStrips.forEach(a=>a.rect=rect(a.rect));sh.axis='V';}
 s.equipmentProfile.firstCutAxis='V';s.equipmentProfile.machineCutAxes=['V'];
 s.plan=makeBandPlan(p,s,s.equipmentProfile);assert.equal(audit(s).metrics.parts,26);
});
test('seeded band search is reproducible and leaves order dimensions untouched',()=>{
 const p=clone(saved.parameters),before=clone(p),opt={iterations:50,seed:42,bandSets:[[719,398,398,270]],axis:'H'};
 const a=searchBands(p,opt),b=searchBands(p,opt);assert.deepEqual(a.best,b.best);assert.deepEqual(p,before);
});

test('a physically consistent rotated sheet is still forbidden by the target roles',()=>{
 const s=clone(saved);s.equipmentProfile.machineCutAxes=['V'];
 s.plan=makeBandPlan(s.parameters,s,s.equipmentProfile);
 const r=auditPrimary(s.parameters,s,s.plan,s.equipmentProfile);
 assert.equal(r.targetPSSModelValid,false);assert.ok(r.errors.some(e=>e.reason.includes('Rotation of original sheet')));
 assert.ok(r.metrics.originalSheetTurns>0);
});
