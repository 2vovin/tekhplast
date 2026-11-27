'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const p=require('../benchmarks/order-234-target14/input.json'),r=require('../benchmarks/order-234-target14/result.json');
const {check}=require('../benchmarks/order-234-target14/verify.cjs'),{validateCompleted}=require('../src/completed-rip-validator');
test('234 parts from all 75 rows fit fourteen sheets with exact half-millimetre dimensions',()=>{
 const v=check();assert.equal(v.geometryValid,true);assert.equal(v.abstractCutTreeValid,true);assert.equal(v.targetPSSModelValid,true);assert.equal(v.realMachineFeasibility,'unknown');
 assert.equal(v.metrics.parts,234);assert.equal(v.metrics.sheets,14);assert.equal(v.minimumSheetsByArea,14);assert.equal(v.sheetCountOptimal,true);
 assert.ok(v.partAreaMm2>v.thirteenSheetUsableAreaMm2);
});
test('reusing a validated subset reproduces the fourteen-sheet complete order',()=>{
 const {reuseAndExtend}=require('../benchmarks/order-234-target14/run-reuse.cjs'),oldP=require('../benchmarks/order-221-target13/input.json'),oldR=require('../benchmarks/order-221-target13/result.json');
 const result=reuseAndExtend(p,oldP,oldR);
 const v=validateCompleted(p,result,result.plan,result.equipmentProfile);
 assert.equal(v.metrics.parts,234);assert.equal(v.metrics.sheets,14);assert.equal(result.search.positionsPreserved,true);
 assert.equal(result.search.priorParts,221);assert.equal(result.search.addedToExisting,2);assert.equal(result.search.remainingParts,11);
});
test('independent replay rejects rounding each fractional original dimension',()=>{
 for(const[id,key]of [[7,'w'],[9,'w'],[57,'l']]){const bad=structuredClone(p),a=bad.pieces.find(a=>a.id===id);a[key]=Math.round(a[key]);assert.throws(()=>validateCompleted(bad,r,r.plan,r.equipmentProfile));}
});
test('independent replay rejects a second physical rotation of one blank',()=>{
 const plan=structuredClone(r.plan),i=plan.operations.findIndex(o=>o.type==='rotate'),o=structuredClone(plan.operations[i]);assert.ok(i>=0);
 o.fromOrientation=o.toOrientation;o.toOrientation=(o.toOrientation+90)%360;o.turnCountBefore=1;o.turnCountAfter=2;o.beforeSize={...o.afterSize};o.afterSize={w:o.beforeSize.h,h:o.beforeSize.w};o.w=o.afterSize.w;o.h=o.afterSize.h;
 plan.operations.splice(i+1,0,o);plan.operations.forEach((o,i)=>o.step=i+1);assert.throws(()=>validateCompleted(p,r,plan,r.equipmentProfile));
});
