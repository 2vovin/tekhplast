'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../benchmarks/order-126-no-rotation/verify.cjs');
const p=require('../benchmarks/order-126-no-rotation/input.json'),r=require('../benchmarks/order-126-no-rotation/result.json');
const {validateCompleted}=require('../src/completed-rip-validator');
test('126 fixed-orientation parts preserve all twelve source rows and pass independent PSS replay',()=>{
 const v=check();assert.equal(v.metrics.parts,126);assert.equal(v.minimumSheetsByArea,5);
 assert.equal(v.geometryValid,true);assert.equal(v.abstractCutTreeValid,true);assert.equal(v.targetPSSModelValid,true);assert.equal(v.realMachineFeasibility,'unknown');
 assert.ok(v.metrics.sheets<=6);assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.originalSheetTurns,0);
 assert.equal(r.sheets.flatMap(s=>s.parts).filter(a=>a.rotated).length,0);
});
test('126-part replay rejects changed dimensions or quantities',()=>{
 for(const field of ['l','q']){const changed=structuredClone(p);changed.pieces[0][field]++;assert.throws(()=>validateCompleted(changed,r,r.plan,r.equipmentProfile));}
});
test('126-part replay rejects a forbidden ninety-degree rotation of a part',()=>{
 const changed=structuredClone(r),part=changed.sheets.flatMap(s=>s.parts).find(a=>a.w===420&&a.h===270);part.rotated=true;[part.w,part.h]=[part.h,part.w];
 assert.throws(()=>validateCompleted(p,changed,changed.plan,changed.equipmentProfile));
});

test('conditional prepared offcut accounts for all four final strips without part rotation',()=>{
 const op=require('../benchmarks/order-126-no-rotation/offcut-prepared-input.json'),or=require('../benchmarks/order-126-no-rotation/offcut-prepared-result.json');
 const ov=validateCompleted(op,or,or.plan,or.equipmentProfile);
 assert.deepEqual([op.sheetW,op.sheetH,op.kerf,op.trim],[1364,415,5,0]);assert.equal(ov.metrics.parts,4);assert.equal(ov.metrics.cuts,3);assert.equal(ov.metrics.turns,0);
 const combined=[...r.sheets.slice(0,5).flatMap(s=>s.parts),...or.sheets[0].parts];
 assert.equal(combined.length,126);
 for(const a of p.pieces){const all=combined.filter(b=>b.id===a.id);assert.equal(all.length,a.q);assert.equal(new Set(all.map(a=>a.instance)).size,a.q);for(const b of all){assert.equal(b.w,a.l);assert.equal(b.h,a.w);assert.equal(b.rotated,false);}}
 const rp=require('../benchmarks/order-126-no-rotation/offcut-raw-input.json'),rr=require('../benchmarks/order-126-no-rotation/offcut-raw-result.json');
 const rv=validateCompleted(rp,rr,rr.plan,rr.equipmentProfile);assert.deepEqual([rp.sheetW,rp.sheetH,rp.trim],[1384,435,10]);assert.equal(rv.metrics.parts,4);
});
