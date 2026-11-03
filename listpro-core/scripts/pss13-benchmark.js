'use strict';
const assert=require('node:assert/strict');
const {searchPSS13}=require('../src/pss-improve');
const {validatePSS}=require('../src/pss-validator');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const order=require('../benchmarks/manual-26-no-rotation.json');
const previous=require('../benchmarks/manual-26-pss.json');
const saved=require('../benchmarks/manual-26-pss-1.3.json');
const result=searchPSS13(order,{profile,previous,seed:1,lnsIterations:5000});
validatePSS(order,result,result.plan,profile);
assert.deepEqual(result.sheets,saved.sheets);
assert.deepEqual(result.plan,saved.plan);
assert.deepEqual(result.metrics,saved.metrics);
console.log(JSON.stringify({version:'PSS 1.3',mode:'warm continuation from saved independently replayed PSS 1.2',
 metrics:result.metrics,search:result.search,oneSheetFound:result.sheets.length===1,optimality:result.optimality},null,2));
