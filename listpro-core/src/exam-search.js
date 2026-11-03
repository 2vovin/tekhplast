'use strict';
const {checkInput}=require('./core');
const {candidate,random}=require('./strip-candidates');
const {validate}=require('./validator');
const {makeExamPlan}=require('./exam-plan');
const {validateExam}=require('./exam-validator');
function searchExam(p,profile,{iterations=30000,seed=1}={}){
 if(!Number.isSafeInteger(iterations)||iterations<1)throw Error('Invalid budget');
 const {jobs}=checkInput(p),rng=random(seed),W=p.sheetW-2*p.trim,k=p.kerf,reserve=k,values=[...new Set(jobs.map(a=>a.l))];
 let best=null,score=null,one=0;const start=Date.now();
 for(let i=0;i<iterations;i++){
  const w=values[i%values.length],other=W-w-2*k-reserve;if(other<=0)continue;
  const order=jobs.map(j=>({j,v:-j.l*j.w*(0.1+2*rng())})).sort((a,b)=>a.v-b.v).map(a=>a.j);
  const s=candidate(p,order,[w,other,reserve],rng,i);
  if(!s)continue;const g=validate(p,s);if(g.sheets===1)one++;
  const v=[g.sheets,g.cuts,g.cutLength,-g.largestWaste];
  if(score&&!v.some((x,n)=>x<score[n]&&v.slice(0,n).every((y,j)=>y===score[j])))continue;
  const plan=makeExamPlan(p,s,profile),verification=validateExam(p,s,plan,profile);
  best={...s,plan,verification,metrics:{...g,...verification.metrics},parameters:p,equipmentProfile:profile};score=v;
 }
 if(!best)throw Error('No solution');best.search={seed,iterations,oneSheetCandidates:one,elapsedMs:Date.now()-start};return best;
}
module.exports={searchExam};