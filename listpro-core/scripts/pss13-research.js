'use strict';
// Separate bounded research run. Absence of a plan is NOT an impossibility proof.
const {checkInput}=require('../src/core');
const {patternDP}=require('../src/pss-pattern-dp');
const {familyJobs,enumerateAnchors,allocateTails}=require('../src/pss-tail-allocation');
const {tailBins,materializePSS}=require('../src/pss-materialize');
const {makePSSPlan}=require('../src/pss-plan');
const {validatePSS}=require('../src/pss-validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const families=familyJobs(checkInput(p).jobs);
for(const options of [
 {frontier:256,maxStates:25000,maxPartitions:10000000,maxCombinations:100000000},
 {frontier:64,retainDominated:true,maxStates:25000,maxPartitions:1000000,maxCombinations:2000000}
]){
 const start=Date.now(),dp=patternDP(families,p.kerf,{maxW:p.sheetW-2*p.trim,maxH:p.sheetH-2*p.trim,maxArea:1800000,...options});
 let patterns=0,valid=0,nodes=0,subsets=0,exhausted=0;
 for(const axis of ['H','V'])for(const pattern of enumerateAnchors(p,families,axis).patterns){
  const bins=tailBins(p,[pattern]),counts=families.map((a,i)=>a.jobs.length-pattern.used[i]);
  const r=allocateTails(families,bins,counts,dp,{kerf:p.kerf,maxStates:10000,maxSubsets:100000});
  patterns++;nodes+=r.stats.nodes;subsets+=r.stats.subsets;exhausted+=Number(r.stats.exhausted);
  if(r.allocation){const s=materializePSS(p,families,[pattern],r.allocation),plan=makePSSPlan(p,s,profile);validatePSS(p,s,plan,profile);valid++;}
 }
 console.log(JSON.stringify({options,patterns,valid,nodes,subsets,allocationExhausted:exhausted,dp:dp.stats,elapsedMs:Date.now()-start,optimality:'not proven'},null,2));
}
