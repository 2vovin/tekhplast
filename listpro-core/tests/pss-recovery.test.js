'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {checkInput}=require('../src/core');
const {candidatePSS,rng}=require('../src/pss-candidates');
const {searchPSS}=require('../src/pss');
const {recoverWaste,searchPSS14,recoveryScore}=require('../src/pss-recovery');
const {localPatterns,wasteInventory,collect}=require('../src/pss-waste-local');
const {validate}=require('../src/validator');
const {makePSSPlan}=require('../src/pss-plan');
const {validatePSS,assessPSS}=require('../src/pss-validator');
const {validateFormatSaw}=require('../src/format-saw-validator');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const format=require('../profiles/format-saw-physical-v1.json');
const p=require('../benchmarks/manual-26-no-rotation.json');
const previous=require('../benchmarks/manual-26-pss-1.3.json');
const direct=require('../benchmarks/manual-26-pss-1.4-waste.json');
const saved=require('../benchmarks/manual-26-pss-1.4.json');
const historical=require('../benchmarks/manual-26-brain-1.1.json');
const clone=x=>JSON.parse(JSON.stringify(x));
const lessOrEqual=(a,b)=>a.every((x,i)=>x===b[i])||a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));
function twoSheets(){
 const q={sheetW:600,sheetH:400,trim:10,kerf:5,pieces:[{id:'anchor',l:400,w:100,q:1,grain:true},{id:'small',l:100,w:100,q:2,grain:true}]},
  jobs=checkInput(q).jobs,sh1=candidatePSS(q,jobs.slice(0,1),'V',rng(1),0),sh2=candidatePSS(q,jobs.slice(1),'V',rng(2),0),
  s=collect({sheets:[...sh1.sheets,...sh2.sheets],version:'fixture'});
 s.plan=makePSSPlan(q,s,profile);s.verification=validatePSS(q,s,s.plan,profile);s.metrics={...validate(q,s),...s.verification.metrics};
 return {q,s};
}
test('real 320x398 waste is discovered with actual secondary identity and role',()=>{
 const inv=wasteInventory(previous,validatePSS(p,previous,previous.plan,profile)),
  target=inv.find(a=>a.sheet===0&&a.rect.x===2420&&a.rect.y===1422);
 assert.deepEqual(target.rect,{x:2420,y:1422,w:320,h:398});assert.equal(target.eligible,true);
 assert.equal(target.blankId,'s0/strip1/work/1/1');assert.equal(target.machineOrientation,180);
 assert(inv.some(a=>!a.eligible&&a.reason.startsWith('PRIMARY_REMAINDER')));
});
test('control transfers exact two instances and replays three cuts plus one turn in target',()=>{
 const s=recoverWaste(p,previous,{profile});
 assert.deepEqual(s.sheets,direct.sheets);assert.deepEqual(s.plan,direct.plan);
 assert.deepEqual(s.sheets.map(sh=>sh.parts.length),[23,3]);
 const parts=s.sheets[0].parts.filter(a=>a.id===9).sort((a,b)=>a.instance-b.instance);
 assert.deepEqual(parts.map(a=>[a.id,a.instance,a.x,a.y,a.w,a.h,a.rotated]),[[9,1,2420,1422,238,180,false],[9,2,2420,1607,238,180,false]]);
 const ops=s.plan.operations.filter(a=>a.materialRect&&a.materialRect.x>=2420&&a.materialRect.y>=1422&&a.materialRect.x+a.materialRect.w<=2740&&a.materialRect.y+a.materialRect.h<=1820);
 assert.equal(ops.filter(a=>a.type==='cut').length,3);assert.equal(ops.filter(a=>a.type==='rotate').length,1);
 assert.deepEqual(ops.filter(a=>a.type==='cut').map(a=>[a.materialAxis,a.materialPos]),[['V',2658],['H',1787],['H',1602]]);
 assert.equal(validatePSS(p,s,s.plan,profile).panelSawStagedValid,true);
 assert.deepEqual(s.sheets[0].primaryStrips,previous.sheets[0].primaryStrips);
});
test('deeper multi-strip DP transfers four total with unchanged order and anchors',()=>{
 const r=validatePSS(p,saved,saved.plan,profile);
 assert.equal(r.metrics.parts,26);assert.deepEqual(saved.parameters,p);
 assert.deepEqual(saved.sheets.map(a=>a.parts.length),[25,1]);
 assert.deepEqual(saved.sheets[1].parts.map(a=>[a.id,a.instance]),[[9,5]]);
 assert.deepEqual(saved.sheets[0].primaryStrips,previous.sheets[0].primaryStrips);
 assert(saved.recovery.accepted.some(a=>a.phase==='multi-strip-count-DP'&&a.region.strips.length>=3));
 assert.equal(saved.metrics.cuts,52);assert.equal(saved.metrics.turns,19);
});
test('all donor parts can be recovered and the additional sheet is removed',()=>{
 const {q,s}=twoSheets(),before=JSON.stringify(s),r=recoverWaste(q,s,{profile});
 assert.equal(r.sheets.length,1);assert.equal(r.metrics.parts,3);assert.equal(JSON.stringify(s),before);
 assert.equal(validatePSS(q,r,r.plan,profile).panelSawStagedValid,true);
});
test('geometry alone does not override configured stage limits',()=>{
 const {q,s}=twoSheets(),pr={...profile,maxStages:s.metrics.stages};
 validatePSS(q,s,s.plan,pr);
 const r=recoverWaste(q,s,{profile:pr});
 validatePSS(q,r,r.plan,pr);
 assert(r.recovery.replayRejected>0||r.metrics.sheets===1);
});
test('local solver rejects insufficient kerf and forbidden texture rotation',()=>{
 const jobs=checkInput(p).jobs.filter(a=>a.id===9).slice(0,2);
 const r=localPatterns({x:0,y:0,w:238,h:364},[],jobs,5);
 assert(!r.candidates.some(a=>a.moved.length===2));
 const q={id:99,instance:1,l:238,w:180,grain:true};
 assert.equal(localPatterns({x:0,y:0,w:180,h:238},[],[q],5).candidates.length,0);
 assert(localPatterns({x:0,y:0,w:180,h:238},[],[{...q,grain:false}],5).candidates.length>0);
});
test('the extra cut separating bottom waste consumes 5 mm; remainder is 28 not 33',()=>{
 const waste=direct.sheets[0].remnants;
 assert(waste.some(a=>a.x===2420&&a.y===1792&&a.w===238&&a.h===28));
 assert(waste.some(a=>a.x===2663&&a.y===1422&&a.w===77&&a.h===398));
});
test('old illegal main turn stays PSS-invalid and FORMAT-valid',()=>{
 const r=assessPSS(p,historical,historical.plan,profile);
 assert(r.violations.some(a=>a.step===9&&a.code==='ROTATE_PRIMARY_REMAINDER'));
 assert.equal(validateFormatSaw(p,historical,historical.plan,format).formatSawValid,true);
 assert.throws(()=>recoverWaste(p,historical,{profile}));
});
test('tampered kerf, child counter, material rotation and stage are rejected independently',()=>{
 for(const mutate of [
  s=>s.plan.operations.find(a=>a.step===30).kerf=4,
  s=>s.plan.operations.find(a=>a.step===33).outputTurnCounts=[1,0],
  s=>s.sheets[0].parts.find(a=>a.id===9).rotated=true,
  s=>s.plan.operations.find(a=>a.step===30).stage=1
 ]){const s=clone(direct);mutate(s);assert.throws(()=>validatePSS(p,s,s.plan,profile));}
});
test('resuming cannot undo recovery to prefer fewer cuts',()=>{
 const r=recoverWaste(p,direct,{profile});
 assert(lessOrEqual(recoveryScore(r),recoveryScore(direct)));
 assert.deepEqual(r.sheets.map(a=>a.parts.length),[23,3]);
});
test('cached badges and metrics are ignored; replay is authoritative',()=>{
 const copy=clone(previous);copy.verification={blanks:[]};copy.metrics={sheets:1,largestWaste:1e30,cuts:0};
 const r=recoverWaste(p,copy,{profile});assert.deepEqual(r.sheets.map(a=>a.parts.length),[23,3]);validatePSS(p,r,r.plan,profile);
});
test('all recovery options and modes are checked',()=>{
 for(const options of [{passes:0},{donorTrials:-1},{multiPasses:-1},{deepRegions:0},{multiFrontier:NaN}])
  assert.throws(()=>recoverWaste(p,previous,{profile,...options}));
 assert.throws(()=>recoverWaste(p,previous,{profile:{...profile,mode:'FORMAT_SAW'}}));
});
test('bounded search records exhaustion while preserving validated output',()=>{
 const r=searchPSS14(p,{profile,previous,dpStates:1,combinations:1,subsets:1,frontier:1,multiStates:1,multiCombinations:1,multiAttempts:1});
 validatePSS(p,r,r.plan,profile);assert(lessOrEqual(recoveryScore(r),recoveryScore(previous)));
});
for(let seed=1;seed<=1000;seed++)test('random recovery independent replay and identity '+seed,()=>{
 const random=rng(seed),q={sheetW:550+seed%4*50,sheetH:400+seed%3*50,trim:seed%7?10:0,kerf:seed%11?5:0,
  pieces:Array.from({length:1+seed%4},(_,i)=>({id:i+1,l:80+Math.floor(random()*300),w:60+Math.floor(random()*220),q:1+seed%(i+3),grain:seed%3!==0}))},
  pr=seed%9?profile:{...profile,maxSheetTurns:0,allowedPrimaryAxes:['V']},
  baseline=searchPSS(q,{profile:pr,seed,iterations:8,refinements:0}),input=JSON.stringify(baseline),
  r=recoverWaste(q,baseline,{profile:pr,seed,donorTrials:2,candidates:2,dpStates:128,combinations:1000,subsets:100,frontier:8,passes:4,deep:seed%20===0,deepRegions:2,deepPasses:1});
 assert.equal(JSON.stringify(baseline),input);assert.equal(validatePSS(q,r,r.plan,pr).panelSawStagedValid,true);
 assert(lessOrEqual(recoveryScore(r),recoveryScore(baseline)));
 assert.equal(r.metrics.parts,q.pieces.reduce((n,a)=>n+a.q,0));
 if(seed<=5){const again=recoverWaste(q,baseline,{profile:pr,seed,donorTrials:2,candidates:2,dpStates:128,combinations:1000,subsets:100,frontier:8,passes:4,deep:seed%20===0,deepRegions:2,deepPasses:1});assert.deepEqual(r.plan,again.plan);}
});
