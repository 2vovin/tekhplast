'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solveIdenticalTwoSheets}=require('../src/identical-strip-patterns');
const {validateHeld}=require('../src/held-strip-validator');
const p=require('../benchmarks/order-44-500x300/input.json'),saved=require('../benchmarks/order-44-500x300/result.json');
test('44 pieces 500x300: unchanged instances, two sheets, retained remnants never rotate',()=>{
 const r=validateHeld(p,saved,saved.plan,saved.equipmentProfile);
 assert.equal(r.metrics.sheets,2);assert.equal(r.metrics.parts,44);assert.equal(r.metrics.cuts,67);assert.equal(r.metrics.turns,7);
 assert.equal(r.metrics.heldRemainderTurns,0);assert.deepEqual(saved.sheets.map(s=>s.parts.length),[28,16]);
 const parts=saved.sheets.flatMap(s=>s.parts);
 assert.deepEqual(parts.map(a=>a.instance).sort((a,b)=>a-b),Array.from({length:44},(_,i)=>i+1));
 assert.ok(parts.every(a=>a.id===1&&((a.w===500&&a.h===300&&!a.rotated)||(a.w===300&&a.h===500&&a.rotated))));
});
test('uniform-strip enumeration independently verifies both residual and cutting-cost alternatives',()=>{
 const r=solveIdenticalTwoSheets(p,saved.equipmentProfile);
 assert.deepEqual(r.remnantBest.verification.metrics,saved.verification.metrics);
 assert.deepEqual(r.remnantBest.sheets.map(s=>s.parts),saved.sheets.map(s=>s.parts));
 assert.equal(r.cutsBest.verification.metrics.cuts,64);assert.equal(r.cutsBest.verification.metrics.turns,6);
 assert.equal(r.remnantBest.verification.metrics.largestWaste,2184000);
 assert.ok(r.stats.verifiedCandidates>1);
});
test('two-sheet necessity follows from unchanged order area, not a search claim',()=>{
 const area=p.pieces.reduce((n,a)=>n+a.q*a.l*a.w,0);
 assert.equal(area,6600000);assert.ok(area>p.sheetW*p.sheetH);
});
