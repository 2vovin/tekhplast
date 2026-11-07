'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../benchmarks/order-182-target16/verify.cjs'),p=require('../benchmarks/order-182-target16/input.json'),r=require('../benchmarks/order-182-target16/result.json'),{validateCompleted}=require('../src/completed-rip-validator');
test('new 100-row order: all 182 unchanged parts physically replay on 16 sheets',()=>{
 const report=check();assert.equal(report.targetPSSModelValid,true);assert.equal(report.metrics.sheets,16);assert(report.inventory.every(a=>a.requested===a.placed));assert.equal(report.realMachineFeasibility,'unknown');
});
test('182-part result cannot validate a changed quantity or a rounded dimension',()=>{
 for(const change of [a=>{a.q++;},a=>{a.l++;}]){const altered=structuredClone(p);change(altered.pieces[0]);assert.throws(()=>validateCompleted(altered,r,r.plan,r.equipmentProfile),/Completed-rip replay/);}
});
