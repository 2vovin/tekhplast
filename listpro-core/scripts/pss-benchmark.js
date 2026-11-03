'use strict';
const assert=require('node:assert/strict');
const {searchPSS}=require('../src/pss');
const {validatePSS,assessPSS}=require('../src/pss-validator');
const {validateFormatSaw}=require('../src/format-saw-validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const format=require('../profiles/format-saw-physical-v1.json');
const old=require('../benchmarks/manual-26-brain-1.1.json');
const saved=require('../benchmarks/manual-26-pss.json');
const result=searchPSS(p,{profile,seed:1,iterations:100000});
validatePSS(p,result,result.plan,profile);validatePSS(p,saved,saved.plan,profile);
assert.deepEqual(result.sheets,saved.sheets);assert.deepEqual(result.plan,saved.plan);
const rejected=assessPSS(p,old,old.plan,profile);
assert.equal(rejected.panelSawStagedValid,false);
assert(rejected.violations.some(a=>a.step===9&&a.code==='ROTATE_PRIMARY_REMAINDER'));
assert.equal(validateFormatSaw(p,old,old.plan,format).formatSawValid,true);
console.log(JSON.stringify({mode:'PANEL_SAW_STAGED',metrics:result.metrics,search:result.search,
 oneSheetFound:result.search.oneSheetCandidates>0,optimality:result.optimality,
 legacyBrain11:{geometryValid:rejected.geometryValid,physicalValid:rejected.physicalValid,PSSValid:false,
  roleViolationAtStep9:rejected.violations.find(a=>a.step===9)}},null,2));
