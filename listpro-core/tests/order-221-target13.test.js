'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../benchmarks/order-221-target13/verify.cjs');
const p=require('../benchmarks/order-221-target13/input.json'),r=require('../benchmarks/order-221-target13/result.json');
const {validateCompleted}=require('../src/completed-rip-validator');
test('221 parts from 64 original rows fit thirteen sheets under independent completed-rip replay',()=>{
 const v=check();assert.equal(v.minimumSheetsByArea,13);assert.equal(v.metrics.parts,221);
 assert.equal(v.geometryValid,true);assert.equal(v.abstractCutTreeValid,true);assert.equal(v.targetPSSModelValid,true);
 assert.equal(v.realMachineFeasibility,'unknown');assert.ok(v.twelveSheetUsableAreaMm2<v.areaMm2);
 assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.originalSheetTurns,0);
});
test('the saved 221-part plan rejects changed dimensions and quantities',()=>{
 for(const field of ['l','q']){const changed=structuredClone(p);changed.pieces[0][field]++;assert.throws(()=>validateCompleted(changed,r,r.plan,r.equipmentProfile));}
});
test('the saved 221-part plan rejects a second physical turn of one blank',()=>{
 const plan=structuredClone(r.plan),i=plan.operations.findIndex(o=>o.type==='rotate'),o=structuredClone(plan.operations[i]);
 assert.ok(i>=0);o.fromOrientation=o.toOrientation;o.toOrientation=(o.toOrientation+90)%360;o.turnCountBefore=1;o.turnCountAfter=2;
 o.beforeSize={...o.afterSize};o.afterSize={w:o.beforeSize.h,h:o.beforeSize.w};o.w=o.afterSize.w;o.h=o.afterSize.h;
 plan.operations.splice(i+1,0,o);plan.operations.forEach((o,i)=>o.step=i+1);
 assert.throws(()=>validateCompleted(p,r,plan,r.equipmentProfile));
});
