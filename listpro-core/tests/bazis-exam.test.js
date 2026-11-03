'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {searchExam}=require('../src/exam-search');const {validateExam}=require('../src/exam-validator');const {exportExam}=require('../src/exam-export');
const p=require('../benchmarks/bazis-26-corrected.json'),saved=require('../benchmarks/bazis-corrected-exam-result.json'),profile=require('../profiles/abstract-staged-detached-strips-exam-v1.json');
test('corrected data is immutable and has 26 true grain instances',()=>{
 assert.equal(p.pieces.length,10);assert.equal(p.pieces.reduce((n,a)=>n+a.q,0),26);
 assert.deepEqual(p.pieces.find(a=>a.id===4),{id:4,name:'Позиция 4',l:238,w:180,q:5,grain:true});
 assert.deepEqual(saved.parameters,p);assert(saved.sheets[0].parts.every(a=>a.rotated===false));
});
test('one sheet replay and explicit unknown machine status',()=>{
 const r=validateExam(p,saved,saved.plan,profile);assert.equal(r.geometryValid,true);assert.equal(r.abstractStagedValid,true);assert.equal(r.machineFeasibility,'unknown');assert.equal(r.metrics.sheets,1);assert.equal(r.metrics.parts,26);
 assert.equal(exportExam(saved).frames.length,44);
});
test('wide strip is genuinely detached, final remainder never becomes strip',()=>{
 const strip=saved.sheets[0].primaryStrips[1];assert.equal(strip.rect.w,2418);assert(!p.pieces.some(a=>a.l===2418));
 const barrier=saved.plan.operations.find(a=>a.type==='endPrimary');assert.equal(barrier.stripBlankIds.length,2);assert(!barrier.stripBlankIds.includes(barrier.remainderBlankId));
 assert(!saved.plan.operations.some(a=>a.inputBlankId===barrier.remainderBlankId));
});
test('bad barrier, second turn, kerf and cutting across attached parts are rejected',()=>{
 for(const mutate of [
 s=>s.plan.operations.find(a=>a.type==='endPrimary').stripBlankIds.push('s0/raw'),
 s=>s.plan.operations.find(a=>a.type==='rotate').turnCountBefore=1,
 s=>s.plan.operations.find(a=>a.type==='cut').kerf=4,
 s=>s.plan.operations.find(a=>a.type==='cut'&&a.phase==='layout').materialPos+=100
 ]){const s=JSON.parse(JSON.stringify(saved));mutate(s);assert.throws(()=>validateExam(p,s,s.plan,profile));}
});
test('machine bounds are enforced without claiming confirmed machine',()=>{
 assert.throws(()=>validateExam(p,saved,saved.plan,{...profile,maxStages:2}));
 assert.throws(()=>validateExam(p,saved,saved.plan,{...profile,maxCutLength:100}));
});
for(let seed=1;seed<=100;seed++)test('corrected order seeded search independently replayed '+seed,()=>{
 const before=JSON.stringify(p),s=searchExam(p,profile,{seed,iterations:100});
 assert.equal(JSON.stringify(p),before);assert.equal(validateExam(p,s,s.plan,profile).metrics.parts,26);
 if(seed===1)assert.deepEqual(searchExam(p,profile,{seed,iterations:100}).plan,s.plan);
});
