'use strict';
const assert=require('node:assert/strict');
const {searchStaged}=require('../src/staged');
const {validate}=require('../src/validator');
const {validateStaged}=require('../src/staged-validator');
const order=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/abstract-staged-v-saw-v1.json');
const saved=require('../benchmarks/manual-26-staged.json');
const result=searchStaged(order,{seed:1,iterations:100000,profile});
const verified=validateStaged(order,result,result.plan,profile);
validateStaged(order,saved,saved.plan,profile);
assert.equal(result.sheets.length,1);assert.equal(result.partCount,26);
assert.deepEqual(result.sheets,saved.sheets);assert.deepEqual(result.plan,saved.plan);
console.log(JSON.stringify({mode:'staged-panel-saw',geometry:validate(order,result),
 statuses:{geometryValid:verified.geometryValid,stagedPlanValid:verified.stagedPlanValid,machineProfileValid:verified.machineProfileValid,conditional:true},
 metrics:verified.metrics,search:result.search,optimality:result.optimality},null,2));

const strict=require('../profiles/abstract-staged-v-no-sheet-turn-v1.json');
const strictResult=validateStaged(order,result,{...result.plan,profileId:strict.id},strict);
assert.equal(strictResult.machineProfileValid,true);
console.log(JSON.stringify({strictNoSheetTurn:strictResult.metrics},null,2));
