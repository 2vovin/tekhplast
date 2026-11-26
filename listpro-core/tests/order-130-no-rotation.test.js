'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../benchmarks/order-130-no-rotation/verify.cjs');
const p=require('../benchmarks/order-130-no-rotation/input.json'),r=require('../benchmarks/order-130-no-rotation/result.json');
const {validateCompleted}=require('../src/completed-rip-validator');
test('130 fixed-orientation parts preserve all twelve source rows and pass independent PSS replay',()=>{
 const v=check();assert.equal(v.metrics.parts,130);assert.equal(v.minimumSheetsByArea,5);
 assert.equal(v.geometryValid,true);assert.equal(v.abstractCutTreeValid,true);assert.equal(v.targetPSSModelValid,true);assert.equal(v.realMachineFeasibility,'unknown');
 assert.ok(v.metrics.sheets<=6);assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.originalSheetTurns,0);
 assert.equal(r.sheets.flatMap(s=>s.parts).filter(a=>a.rotated).length,0);
});
test('130-part replay rejects changed dimensions or quantities',()=>{
 for(const field of ['l','q']){const changed=structuredClone(p);changed.pieces[0][field]++;assert.throws(()=>validateCompleted(changed,r,r.plan,r.equipmentProfile));}
});
test('130-part replay rejects a forbidden ninety-degree rotation of a part',()=>{
 const changed=structuredClone(r),part=changed.sheets.flatMap(s=>s.parts).find(a=>a.w===420&&a.h===270);part.rotated=true;[part.w,part.h]=[part.h,part.w];
 assert.throws(()=>validateCompleted(p,changed,changed.plan,changed.equipmentProfile));
});
