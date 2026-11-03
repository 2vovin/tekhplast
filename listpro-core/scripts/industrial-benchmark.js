'use strict';
const assert=require('node:assert/strict');
const {searchIndustrial}=require('../src/industrial');
const {validate}=require('../src/validator');
const {validateStaged}=require('../src/staged-validator');
const order=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/abstract-staged-v-saw-v1.json');
const strict=require('../profiles/abstract-staged-v-no-sheet-turn-v1.json');
const saved=require('../benchmarks/manual-26-brain-1.1.json');
const baseline=require('../benchmarks/manual-26-staged.json');
const result=searchIndustrial(order,{profile,seed:1,iterations:100000});
const checked=validateStaged(order,result,result.plan,profile);
validateStaged(order,saved,saved.plan,profile);
validateStaged(order,result,{...result.plan,profileId:strict.id},strict);
assert.equal(result.sheets.length,1);assert.equal(result.partCount,26);
assert.deepEqual(result.sheets,saved.sheets);assert.deepEqual(result.plan,saved.plan);
assert(result.metrics.largestWaste>=baseline.metrics.largestWaste);
assert(result.metrics.cuts<baseline.metrics.cuts);
console.log(JSON.stringify({version:'1.1',geometry:validate(order,result),metrics:result.metrics,
 statuses:{geometryValid:checked.geometryValid,stagedPlanValid:checked.stagedPlanValid,machineProfileValid:checked.machineProfileValid,conditional:true},
 baseline:baseline.metrics,search:result.search,optimality:result.optimality},null,2));
