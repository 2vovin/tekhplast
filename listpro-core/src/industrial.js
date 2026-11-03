'use strict';
const {checkInput}=require('./core');
const {validate}=require('./validator');
const {random,candidate,widthsFor}=require('./strip-candidates');
const {searchStaged}=require('./staged');
const {rebuildLayout}=require('./strip-dp');
const {groupedCandidate}=require('./strip-blocks');
const {makeStagedPlan}=require('./staged-plan');
const {validateStaged}=require('./staged-validator');
function objective(geometry,m){
 return [geometry.sheets,-geometry.largestWaste,m.cuts,m.operations,m.turns,m.cutLength,m.stages];
}
function less(a,b){return !b||a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));}
function searchIndustrial(p,options={}){
 const {jobs}=checkInput(p),profile=options.profile;
 if(!profile)throw Error('Explicit industrial profile required');
 const iterations=options.iterations??100000,seed=options.seed??1,dpBudget=options.dpStates??12000;
 if(!Number.isSafeInteger(iterations)||iterations<1||!Number.isSafeInteger(dpBudget)||dpBudget<1)throw Error('Invalid industrial budget');
 const start=Date.now(),baselineBudget=Math.max(1,Math.floor(iterations/2)),rng=random(seed^0x9e3779b9);
 let best=null,bestScore=null,geometryCandidates=0,rejected=0,failed=0,dpCalls=0,dpStates=0,dpTransitions=0,dpPruned=0,dpExhausted=0,localStates=0;
 const distribution={},improvements=[];
 function accept(s,phase){
  try{
   const geometry=validate(p,s),plan=makeStagedPlan(p,s,profile),verification=validateStaged(p,s,plan,profile);
   const score=objective(geometry,verification.metrics);
   if(less(score,bestScore)){
    best=s;bestScore=score;best.plan=plan;best.verification=verification;best.metrics={...geometry,...verification.metrics};
    improvements.push({phase,score:score.slice()});return true;
   }
  }catch(e){rejected++;}
  return false;
 }
 if(options.previous) {
  // Never trust saved validation badges or a former plan.
  validate(p,options.previous);
  accept(JSON.parse(JSON.stringify(options.previous)),'previous');
 }
 // Broad legacy search remains an independent baseline candidate, not the final objective.
 let legacy;
 try{legacy=searchStaged(p,{seed,iterations:baselineBudget,profile});accept(legacy,'multistart-baseline');}
 catch(e){if(!best&&iterations===1)throw e;}
 if(legacy)Object.assign(distribution,legacy.search.distribution);
 const cap=p.sheetW-2*p.trim,dp=Array.from({length:5},()=>new Set());dp[0].add(0);
 for(const j of jobs)for(let n=4;n>=1;n--)for(const sum of dp[n-1]){
  const next=sum+j.l+(n>1?p.kerf:0);if(next<cap)dp[n].add(next);
 }
 const groups=[...new Set([...dp[2],...dp[3],...dp[4]])];
 const lookup=new Map(jobs.map(j=>[JSON.stringify([j.id,j.instance]),j]));
 function refine(s,phase){
  const r=rebuildLayout(p,s,profile,{maxStates:dpBudget,frontierSize:6,beamSize:8});
  dpCalls++;dpStates+=r.stats.states;dpTransitions+=r.stats.transitions;dpPruned+=r.stats.pruned;if(r.stats.exhausted)dpExhausted++;
  for(const variant of r.variants)accept(variant,phase);
 }
 if(best)refine(best,'baseline-strip-DP');
 for(let i=baselineBudget;i<iterations;i++){
  let widths=widthsFor(p,jobs,rng,i,groups);
  let order;
  if(i%4===0){
   // Keep equal geometries together; randomize families, not their required multiplicity.
   const families=new Map();
   for(const j of jobs){const key=JSON.stringify([j.l,j.w,j.grain!==false]);if(!families.has(key))families.set(key,[]);families.get(key).push(j);}
   order=[...families.values()].map(a=>({a,key:-(a[0].l*a[0].w)*Math.sqrt(a.length)*(0.3+rng())})).sort((a,b)=>a.key-b.key).flatMap(a=>a.a);
  }else order=jobs.map(j=>({j,key:-(j.l*j.w)*(0.15+rng()*1.7)})).sort((a,b)=>a.key-b.key).map(a=>a.j);
  if(best&&i%4===3&&best.partOrder?.length===jobs.length){
   const inherited=best.partOrder.map(key=>lookup.get(JSON.stringify(key)));
   if(inherited.every(Boolean)&&new Set(inherited).size===jobs.length){
    localStates++;order=inherited;
    if(order.length>1){const from=Math.floor(rng()*order.length),to=Math.floor(rng()*order.length);order.splice(to,0,order.splice(from,1)[0]);}
    widths=best.sheets[0].primaryStrips.map(a=>a.rect.w);
    if(widths.length>1&&rng()<0.7){
     const a=Math.floor(rng()*(widths.length-1)),delta=(rng()<0.5?-1:1)*(1+Math.floor(rng()*80));
     if(widths[a]+delta>0&&widths[a+1]-delta>0){widths[a]+=delta;widths[a+1]-=delta;}
    }
   }
  }
  const s=i%3===0?groupedCandidate(p,jobs,rng,i):candidate(p,order,widths,rng,i,i%6===0?'H':i%6===1?'V':null);
  if(!s){failed++;continue;}
  const geometry=validate(p,s);geometryCandidates++;distribution[geometry.sheets]=(distribution[geometry.sheets]??0)+1;
  if(bestScore&&geometry.sheets>bestScore[0])continue;
  const competitive=!bestScore||geometry.largestWaste>=-bestScore[1];
  let improved=false;
  if(competitive)improved=accept(s,'grouped-local-search');
  // Refine verified improvements; periodic fixed-placement DP also explores alternate cut trees.
  if(improved||(dpCalls<96&&geometry.sheets===(bestScore?.[0]??1)&&geometry.largestWaste>=(-bestScore[1])*0.3))refine(s,'candidate-strip-DP');
 }
 if(!best)throw Error('No technologically validated industrial solution found');
 refine(best,'final-strip-DP');
 best.method='listpro-brain-1.1-industrial-staged';best.optimality='not proven';
 best.parameters=JSON.parse(JSON.stringify(p));best.equipmentProfile=JSON.parse(JSON.stringify(profile));
 best.search={version:'1.1',seed,iterations,states:iterations,baselineStates:baselineBudget,
  groupedStates:iterations-baselineBudget,geometryCandidates:geometryCandidates+(legacy?.search.geometryCandidates??0),
  failedWidthAssignments:failed+(legacy?.search.failedWidthAssignments??0),distribution,localStates,
  dpGroupWidths:groups.length,dpCalls,dpStates,dpTransitions,dpPruned,dpExhausted,technologyRejected:rejected,
  objective:['sheets','largestRectangularRemnantDescending','cuts','operations','turns','cutLength','stages'],
  improvements,elapsedMs:Date.now()-start};
 return best;
}
module.exports={searchIndustrial,objective};
