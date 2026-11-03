'use strict';
const {searchPSS13}=require('./pss-improve');
const {searchPSS14}=require('./pss-recovery');
const {validatePSS}=require('./pss-validator');
function cost(s){const m=s.metrics;return [m.sheets,m.cuts,m.turns,m.operations,m.cutLength,-m.largestWaste];}
function less(a,b){return a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));}
function searchPSS15(p,options={}){
 const profile=options.profile,iterations=options.iterations??2000;
 if(!Number.isSafeInteger(iterations)||iterations<1)throw Error('Invalid global search budget');
 const alternatives=[];
 function keep(s,label){
  const verification=validatePSS(p,s,s.plan,profile);
  const copy=JSON.parse(JSON.stringify(s));copy.verification=verification;copy.metrics={...copy.metrics,...verification.metrics};
  alternatives.push({label,result:copy});return copy;
 }
 for(const [i,s] of (options.alternatives??[]).entries())keep(s,'saved-'+i);
 if(options.previous)keep(options.previous,'previous');
 if(!alternatives.length)throw Error('Supply verified initial alternatives');
 const start=Date.now(),trials=[];
 for(let seed=1;seed<=(options.seeds??3);seed++){
  const base=alternatives.reduce((a,b)=>less(cost(b.result),cost(a.result))?b:a).result;
  const global=searchPSS13(p,{profile,previous:base,seed,lnsIterations:iterations,maxPatterns:256});
  keep(global,'global-LNS-'+seed);
  const repaired=searchPSS14(p,{profile,previous:global,seed,multiAttempts:256,multiGroups:128,multiPasses:3});
  keep(repaired,'global-repair-'+seed);
  trials.push({seed,search:global.search,recovery:repaired.recovery});
 }
 const best=alternatives.reduce((a,b)=>less(cost(b.result),cost(a.result))?b:a);
 return {version:'1.5',best:best.result,alternatives,search:{iterations,seeds:options.seeds??3,trials,elapsedMs:Date.now()-start},optimality:'not proven'};
}
module.exports={searchPSS15,cost};
