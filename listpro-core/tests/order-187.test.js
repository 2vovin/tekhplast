'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {check}=require('../benchmarks/order-187-target16/verify.cjs'),p=require('../benchmarks/order-187-target16/input.json'),r=require('../benchmarks/order-187-target16/result.json'),old=require('../benchmarks/order-182-target16/result.json'),{validateCompleted}=require('../src/completed-rip-validator');
test('revised order: all 187 parts from 99 exact rows replay on 16 sheets',()=>{
 const report=check();assert.equal(report.metrics.parts,187);assert.equal(report.metrics.sheets,16);assert.equal(report.areaMm2,74519000);assert.equal(report.minimumSheetsByArea,16);assert.equal(report.sheetCountOptimal,true);assert(report.areaMm2>report.fifteenSheetUsableAreaMm2);
 assert.equal(report.inventory.find(a=>a.id===71).placed,3);assert.equal(report.inventory.find(a=>a.id===72).placed,1);
 assert.equal(report.inventory.find(a=>a.id===99).placed,15);assert.equal(report.inventory.find(a=>a.id===66).placed,2);
 assert.equal(p.pieces.some(a=>a.l===300&&a.w===270),false);assert.equal(report.realMachineFeasibility,'unknown');
});
test('the old 182-part map is rejected for the revised order',()=>{
 assert.throws(()=>validateCompleted(p,old,old.plan,old.equipmentProfile),/Completed-rip replay/);
});
test('saved native certificate rebuilds the 187-part physical plan',()=>{
 const csv=fs.readFileSync(path.join(__dirname,'../benchmarks/order-187-target16/certificate.csv'),'utf8');
 const converted=require('../src/packing-pss').convert(p,csv,{axis:'H'});
 assert.deepEqual(validateCompleted(p,converted,converted.plan,converted.equipmentProfile).metrics,r.metrics);
});
