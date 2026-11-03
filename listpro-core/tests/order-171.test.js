'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {searchAdaptive,repackAdaptive}=require('../src/adaptive-held-strip');
const {makeHeldPlan}=require('../src/held-strip-plan');
const {validateHeld}=require('../src/held-strip-validator');
const {artifacts}=require('../src/order-held-artifacts');
const p=require('../benchmarks/order-171/input.json'),s=require('../benchmarks/order-171/result.json');
const profile=s.equipmentProfile;
const check=r=>validateHeld(p,r,r.plan,r.equipmentProfile);
test('order-171: exact 98 supplied rows, 171 instances, first row is a detail',()=>{
 assert.equal(p.pieces.length,98);assert.equal(p.pieces.reduce((n,a)=>n+a.q,0),171);
 assert.equal(p.pieces.reduce((n,a)=>n+a.l*a.w*a.q,0),46160513);
 assert.deepEqual(p.pieces.slice(0,2).map(a=>[a.l,a.w,a.q]),[[2108,968,1],[2108,968,1]]);
 assert.ok(p.pieces.every(a=>a.grain===false));
 assert.equal(p.pieces.filter(a=>a.l%1||a.w%1).length,6);
});
test('order-171: independent replay verifies 349 cuts and zero retained rotations',()=>{
 const r=check(s);assert.equal(r.metrics.parts,171);assert.equal(r.metrics.sheets,11);
 assert.equal(r.metrics.cuts,349);assert.equal(r.metrics.turns,99);
 assert.equal(r.metrics.heldRemainderTurns,0);assert.equal(r.metrics.originalSheetTurns,0);
 assert.equal(r.realMachineFeasibility,'unknown');
});
test('order-171: every original row and instance survives, including half millimetres',()=>{
 const parts=s.sheets.flatMap(a=>a.parts);
 for(const a of p.pieces){
  const found=parts.filter(b=>b.id===a.id);assert.equal(found.length,a.q);
  assert.deepEqual(found.map(b=>b.instance).sort((a,b)=>a-b),Array.from({length:a.q},(_,i)=>i+1));
  for(const b of found)assert.deepEqual([b.w,b.h],b.rotated?[a.w,a.l]:[a.l,a.w]);
 }
 assert.equal(parts.filter(a=>a.id===98).length,12);
});
test('adaptive search uses allowed detail rotation when required by the sheet',()=>{
 const q={sheetW:500,sheetH:700,kerf:5,trim:10,pieces:[{id:1,l:600,w:200,q:1,grain:false}]};
 const pr={...profile,firstCutAxis:'H',machineCutAxes:['H']};
 const r=searchAdaptive(q,{iterations:3}).best;
 assert.equal(r.sheets[0].parts[0].rotated,true);
 assert.equal(validateHeld(q,r,makeHeldPlan(q,r,pr),pr).metrics.parts,1);
 assert.throws(()=>searchAdaptive({...q,pieces:[{...q.pieces[0],grain:true}]},{iterations:1}),/No fitting detached strip/);
});
test('adaptive search accepts exact fractional dimensions for both initial axes',()=>{
 for(const axis of ['H','V']){
  const q={sheetW:700,sheetH:500,kerf:5,trim:10,pieces:[{id:1,l:123.5,w:59,q:6,grain:false},{id:2,l:118.5,w:118.5,q:3,grain:false}]};
  const pr={...profile,firstCutAxis:axis,machineCutAxes:[axis]};
  const r=searchAdaptive(q,{iterations:3,axis}).best;
  assert.equal(validateHeld(q,r,makeHeldPlan(q,r,pr),pr).metrics.parts,9);
 }
});
test('sheet neighborhood remaps original instances and does not mutate input',()=>{
 const before=JSON.stringify(s);
 const r=repackAdaptive(p,s,{sheetIndices:[10],iterations:3,axis:'V'}).best;
 assert.equal(JSON.stringify(s),before);
 assert.equal(validateHeld(p,r,makeHeldPlan(p,r,profile),profile).metrics.parts,171);
 assert.throws(()=>repackAdaptive(p,s,{sheetIndices:[10,10]}),/Invalid sheet/);
});
test('adaptive search invalid budgets are rejected',()=>{
 assert.throws(()=>searchAdaptive(p,{iterations:0}),/Search options/);
 assert.throws(()=>searchAdaptive(p,{candidates:0}),/Search options/);
});
test('order-171: maps, strip plans and physical replay frames cover the whole order',()=>{
 const a=artifacts(s),frames=JSON.parse(a['frames.json']);
 assert.equal(Object.keys(a).filter(k=>/^sheet-\d+.svg$/.test(k)).length,11);
 assert.equal(Object.keys(a).filter(k=>/^primary-\d+.svg$/.test(k)).length,11);
 assert.equal(a['parts.csv'].trim().split('\n').length,172);
 assert.equal(frames.filter(f=>f.type==='cut').length,349);
 assert.equal(frames.filter(f=>f.type==='rotate').length,99);
 assert.ok(a['replay.html'].includes('application/json'));
 assert.ok(a['operations.csv'].includes('advance-in-place'));
});
test('order-171: actual machine capacity is checked separately',()=>{
 assert.throws(()=>validateHeld(p,s,s.plan,{...profile,maxCutLength:1000}),/stroke limit/);
});
