'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {searchRecursive,linearDP,families,random}=require('../src/recursive-strip');
const {validateRecursive}=require('../src/recursive-strip-validator');
const {artifacts}=require('../src/recursive-strip-artifacts');
const p=require('../benchmarks/bazis-26-corrected.json'),profile=require('../profiles/abstract-staged-detached-strips-exam-v1.json');
const saved=require('../benchmarks/brain2/fewest-cuts/result.json');
const copy=x=>JSON.parse(JSON.stringify(x));
test('corrected dimensions unchanged and 41 physical cuts independently replay',()=>{
 assert.deepEqual(saved.parameters,p);
 const v=validateRecursive(p,saved,saved.plan,profile);
 assert.equal(v.metrics.parts,26);assert.equal(v.metrics.sheets,1);assert.equal(v.metrics.cuts,41);
 assert.equal(v.geometryValid,true);assert.equal(v.abstractCutPlanValid,true);assert.equal(v.machineFeasibility,'unknown');
 assert(saved.sheets[0].parts.every(a=>!a.rotated));
 assert.equal(saved.plan.operations.filter(o=>o.type==='cut').length,41);
 assert(artifacts(saved)['operations.html'].includes('svg'));
});
test('wide strip has a real separation and no fabricated anchor',()=>{
 const s=saved.sheets[0].primaryStrips[0];
 assert.equal(s.rect.w,2720);assert(!p.pieces.some(a=>a.l===2720));
 const barrier=saved.plan.operations.find(o=>o.type==='endPrimary');
 assert(!barrier.stripBlankIds.includes(barrier.remainderBlankId));
 assert(!saved.plan.operations.some(o=>o.inputBlankId===barrier.remainderBlankId));
});
const mutations={
 'kerf':s=>s.plan.operations.find(o=>o.type==='cut').kerf--,
 'grain':s=>s.sheets[0].parts[0].rotated=true,
 'attached part cut':s=>s.plan.operations.find(o=>o.type==='cut'&&o.phase==='layout').materialPos+=100,
 'second turn':s=>s.plan.operations.find(o=>o.type==='rotate').turnCountBefore=1,
 'child counters':s=>s.plan.operations.find(o=>o.type==='cut').outputTurnCounts=[1,0],
 'reused blank':s=>{const o=s.plan.operations.find(o=>o.type==='cut');o.outputBlankIds[0]=o.inputBlankId;},
 'fake strip':s=>s.sheets[0].primaryStrips[0].rect.w++,
 'fake physical strip':s=>s.plan.primaryStrips[0].blankId='s0/raw',
 'main remainder as strip':s=>{const b=s.plan.operations.find(o=>o.type==='endPrimary');b.stripBlankIds.push(b.remainderBlankId);},
 'main remainder rotated':s=>{const b=s.plan.operations.find(o=>o.type==='endPrimary'),o=s.plan.operations.find(o=>o.type==='rotate');o.inputBlankId=b.remainderBlankId;o.outputBlankIds=[b.remainderBlankId];},
 'missing detail':s=>s.sheets[0].parts.pop(),
 'wrong cut length':s=>s.plan.operations.find(o=>o.type==='cut').end.y--,
 'false output':s=>s.plan.outputs.find(o=>o.kind==='part').part.instance=999
};
for(const [name,mutate] of Object.entries(mutations))test('reject '+name,()=>{const s=copy(saved);mutate(s);assert.throws(()=>validateRecursive(p,s,s.plan,profile));});
test('finite machine restrictions reject while unknown stays unknown',()=>{
 for(const limits of [{maxStages:2},{maxCutLength:100},{minHoldWidth:500},{maxFeedWidth:500}])
  assert.throws(()=>validateRecursive(p,saved,saved.plan,{...profile,...limits}));
 assert.throws(()=>searchRecursive(p,{...profile,mode:'FORMAT_SAW'},{iterations:1}));
});
test('invalid inputs and budget rejected without a false infeasibility claim',()=>{
 for(const input of [{...p,kerf:0},{...p,trim:1},{...p,sheetW:2750.5},{...p,pieces:[]},{...p,pieces:[{id:1,l:99999,w:99999,q:1}]}])
  assert.throws(()=>searchRecursive(input,profile,{iterations:1}));
 for(const opts of [{iterations:0},{iterations:1,deltas:[1]},{iterations:1,seed:NaN}])assert.throws(()=>searchRecursive(p,profile,opts));
});
test('grouping preserves texture and true IDs',()=>{
 const groups=families([{id:1,instance:1,l:10,w:20,grain:true},{id:2,instance:1,l:10,w:20,grain:false},{id:3,instance:1,l:10,w:20,grain:true}]);
 assert.deepEqual(groups.map(g=>g.map(j=>j.id)),[[1,3],[2]]);
});
test('deterministic search, immutable input, independently verified snapshots',()=>{
 const before=JSON.stringify(p);let snapshots=0;
 const a=searchRecursive(p,profile,{iterations:300,onBest:s=>{validateRecursive(p,s,s.plan,profile);snapshots++;}});
 const b=searchRecursive(p,profile,{iterations:300});
 assert.deepEqual(a.best.plan,b.best.plan);assert.equal(JSON.stringify(p),before);assert(snapshots>0);
});
for(let seed=1;seed<=100;seed++)test('linear DP versus exhaustive subsets '+seed,()=>{
 const rng=random(seed),items=Array.from({length:8},(_,i)=>({i,length:1+Math.floor(rng()*15),value:1+Math.floor(rng()*30)})),cap=30,k=2;
 let expected=0;
 for(let mask=1;mask<256;mask++){let length=-k,value=0;items.forEach((it,i)=>{if(mask&(1<<i)){length+=it.length+k;value+=it.value;}});
 if(length<=cap&&(length===cap||cap-length>=k))expected=Math.max(expected,value);}
 const r=linearDP(items,cap,k);assert.equal(r.value,expected);assert.equal(r.exact,true);
});
test('bounded DP reports pruning rather than pretending exactness',()=>assert.equal(linearDP(Array.from({length:10},(_,i)=>({length:i+1,value:i+1})),100,1,3).exact,false));
for(let seed=1;seed<=1000;seed++)test('random recursive plan independent replay '+seed,()=>{
 const rng=random(seed),input={sheetW:600,sheetH:500,kerf:3,trim:6,pieces:Array.from({length:1+seed%8},(_,i)=>({id:i+1,l:20+Math.floor(rng()*210),w:20+Math.floor(rng()*150),q:1+seed%3,grain:seed%4!==0}))};
 const s=searchRecursive(input,profile,{seed,iterations:2}).best;
 const v=validateRecursive(input,s,s.plan,profile);
 assert.equal(v.metrics.parts,input.pieces.reduce((sum,a)=>sum+a.q,0));
});

test('validated incumbent survives a short resumed search',()=>{
 const r=searchRecursive(p,profile,{iterations:1,previous:saved});
 assert.equal(r.best.metrics.sheets,1);assert(r.best.metrics.largestWaste>=saved.metrics.largestWaste);
 const bad=copy(saved);bad.plan.operations.find(o=>o.type==='cut').kerf=1;
 assert.throws(()=>searchRecursive(p,profile,{iterations:1,previous:bad}));
});

test('two real rotations of the SAME terminal blank pass geometry but fail staged replay',()=>{
 const s=copy(saved),o=s.plan.outputs.find(o=>o.kind==='waste'&&o.blankId.includes('/strip')&&o.turnCount===0&&o.materialRect.w>0&&o.materialRect.h>0);
 assert(o);const r=o.materialRect;let q=o.machineOrientation/90;
 const dim=()=>q%2?{w:r.h,h:r.w}:{w:r.w,h:r.h};
 const add=op=>s.plan.operations.push({step:s.plan.operations.length+1,...op});
 add({type:'feed',inputBlankId:o.blankId,machineOrientation:q*90,materialRect:r,...dim()});
 for(let turn=0;turn<2;turn++){
  const from=q*90;q=(q+1)%4;
  add({type:'rotate',inputBlankId:o.blankId,outputBlankIds:[o.blankId],angle:90,fromOrientation:from,toOrientation:q*90,turnCountBefore:turn,turnCountAfter:turn+1,materialRect:r,...dim()});
 }
 o.machineOrientation=q*90;o.turnCount=2;o.machineGrain=[[1,0],[0,1],[-1,0],[0,-1]][q];
 // Raw geometric/coordinate replay deliberately has no staged role policy.
 assert.equal(require('../src/physical-replay').replayPhysical(p,s,s.plan,profile).physicalValid,true);
 assert.throws(()=>validateRecursive(p,s,s.plan,profile),/Illegal main\/double\/early turn/);
});
test('real rotation of primary remainder is rejected despite coherent coordinates',()=>{
 const s=copy(saved),index=s.plan.operations.findIndex(o=>o.type==='endPrimary'),barrier=s.plan.operations[index],o=s.plan.outputs.find(o=>o.blankId===barrier.remainderBlankId),r=o.materialRect;
 const ops=[{type:'feed',inputBlankId:o.blankId,machineOrientation:0,w:r.w,h:r.h,materialRect:r},
 {type:'rotate',inputBlankId:o.blankId,outputBlankIds:[o.blankId],angle:90,fromOrientation:0,toOrientation:90,turnCountBefore:0,turnCountAfter:1,w:r.h,h:r.w,materialRect:r}];
 s.plan.operations.splice(index,0,...ops);s.plan.operations.forEach((op,i)=>op.step=i+1);
 o.machineOrientation=90;o.turnCount=1;o.machineGrain=[0,1];
 assert.equal(require('../src/physical-replay').replayPhysical(p,s,s.plan,profile).physicalValid,true);
 assert.throws(()=>validateRecursive(p,s,s.plan,profile),/Illegal main\/double\/early turn/);
});
