'use strict';
const assert=require('node:assert/strict');
const {recoverWaste,searchPSS14}=require('../src/pss-recovery');
const {validatePSS}=require('../src/pss-validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const previous=require('../benchmarks/manual-26-pss-1.3.json');
const expectedDirect=require('../benchmarks/manual-26-pss-1.4-waste.json');
const expected=require('../benchmarks/manual-26-pss-1.4.json');
const direct=recoverWaste(p,previous,{profile});
const result=searchPSS14(p,{profile,previous});
for(const [actual,saved] of [[direct,expectedDirect],[result,expected]]){
 assert.deepEqual(actual.sheets,saved.sheets);assert.deepEqual(actual.plan,saved.plan);assert.deepEqual(actual.metrics,saved.metrics);
 validatePSS(p,actual,actual.plan,profile);
}
assert.deepEqual(direct.sheets.map(a=>a.parts.length),[23,3]);
assert.deepEqual(result.sheets.map(a=>a.parts.length),[25,1]);
console.log(JSON.stringify({version:'PSS 1.4',parametersUnchanged:true,baseline:previous.metrics,
 direct:{metrics:direct.metrics,recovery:direct.recovery},
 final:{metrics:result.metrics,recovery:result.recovery},oneSheetFound:result.sheets.length===1,optimality:'not proven'},null,2));
