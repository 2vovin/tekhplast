'use strict';
// Extended, bounded research of the one remaining #9. No impossibility claim.
const {searchPSS14}=require('../src/pss-recovery');
const {validatePSS}=require('../src/pss-validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const previous=require('../benchmarks/manual-26-pss-1.4.json');
const result=searchPSS14(p,{profile,previous,multiRetainDominated:true,multiFrontier:128,
 multiCombinations:5000000,multiStates:15000,dpStates:10000,combinations:2000000,frontier:64});
validatePSS(p,result,result.plan,profile);
console.log(JSON.stringify({metrics:result.metrics,recovery:result.recovery,optimality:'not proven'},null,2));
