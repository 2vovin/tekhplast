'use strict';
const {checkInput}=require('./core');
const {trial,random}=require('./recursive-strip'); // immutable Brain 2.0 candidate generator
const {validate}=require('./validator');
const {makeExamPlan}=require('./exam-plan');
const {checkProfile}=require('./bazis-10-tech-profile');
const {validateAncestryTurns}=require('./ancestry-validator');
const {shelfTrial}=require('./brain21-shelves');
const {columnFallback}=require('./brain21-columns');
const {sortStrips}=require('./strip-ordering');
const {schedulePlan}=require('./stop-scheduler');
const clone=x=>JSON.parse(JSON.stringify(x));
function score(s){const m=s.metrics;return s.technologyProfile.ranking.map(k=>k==='usefulRemnantArea'?-m[k]:m[k]);}
function frontierScore(s){return [...score(s),s.metrics.ancestryTurnsMax];}
function lex(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;}
function dominates(a,b){return a.every((x,i)=>x<=b[i])&&a.some((x,i)=>x<b[i]);}
function optimizeTechnology(p,profile,options={}){
 checkProfile(profile);const {jobs}=checkInput(p);
 if(!jobs.length||![p.sheetW,p.sheetH,p.kerf,p.trim,...jobs.flatMap(j=>[j.l,j.w])].every(Number.isSafeInteger)||p.kerf<1||(p.trim>0&&p.trim<p.kerf))throw Error('Unsupported input');
 const iterations=options.iterations??20000,seed=options.seed??2026,postprocessLimit=options.postprocessLimit??24;
 if(!Number.isSafeInteger(iterations)||iterations<0||!Number.isSafeInteger(seed)||!Number.isSafeInteger(postprocessLimit)||postprocessLimit<0)throw Error('Invalid search budget');
 const shelfIterations=options.shelfIterations??Math.min(50,iterations);
 if(!Number.isSafeInteger(shelfIterations)||shelfIterations<0)throw Error('Invalid shelf budget');
 const started=Date.now(),rng=random(seed),deltas=[0,0.05,0.1,0.2,0.5,0.99];
 const stats={seed,iterations,shelfIterations,postprocessLimit,rectangles:0,dpCalls:0,dpStates:0,prunedDP:0,primaryDP:0,validated:0,rejectedAncestry:0,
  initialAccepted:0,postprocessed:0,solverDepth:0,schedulerSearchNodes:0,schedulerExhausted:false};
 let best=null,pareto=[];
 function accept(layout,plan,provenance,scheduling){
  let verification;
  try{verification=validateAncestryTurns(p,layout,plan,profile);}
  catch(e){if(e.code==='ANCESTRY_LIMIT'){stats.rejectedAncestry++;return null;}throw e;}
  stats.validated++;
  const s={...layout,method:'brain-2.1-technological',parameters:clone(p),equipmentProfile:clone(profile.baseProfile),technologyProfile:clone(profile),
   plan,verification,metrics:verification.metrics,provenance,schedulingSearch:scheduling??null,optimality:'not proven'};
  if(scheduling){stats.solverDepth=Math.max(stats.solverDepth,scheduling.solverDepth);stats.schedulerSearchNodes+=scheduling.searchNodes;stats.schedulerExhausted||=scheduling.exhausted;}
  if(best&&s.metrics.sheets>best.metrics.sheets)return s;
  if(best&&s.metrics.sheets<best.metrics.sheets)pareto=[];
  const v=frontierScore(s);
  if(!pareto.some(a=>lex(frontierScore(a),v)===0||dominates(frontierScore(a),v))){pareto=pareto.filter(a=>!dominates(v,frontierScore(a)));pareto.push(s);}
  if(!best||lex(score(s),score(best))<0){best=s;if(options.onBest)options.onBest(clone(s));}
  return s;
 }
 for(const initial of options.initialLayouts??[]){
  const s=clone(initial);const plan=s.plan??makeExamPlan(p,s,profile.baseProfile);
  if(accept(s,plan,{kind:'revalidated-incumbent'},null))stats.initialAccepted++;
 }
 const fallback=columnFallback(p,jobs);accept(fallback,makeExamPlan(p,fallback,profile.baseProfile),{kind:'column-fallback'},null);
 for(let i=0;i<iterations;i++){
  const config={delta:deltas[i%deltas.length],dp:i%5===0,vertical:(i%7)/6,choices:1+i%3,reverse:i%2===0,primary:i%20===19?3:i%4===0?0:i%4===1?2:1};
  const layout=trial(p,jobs,config,rng,stats);if(!layout)continue;
  const g=validate(p,layout);if(best&&g.sheets>best.metrics.sheets)continue;
  const plan=makeExamPlan(p,layout,profile.baseProfile);
  accept(layout,plan,{kind:'new-trial',iteration:i,config},null);
 }
 const shelfRng=random(seed^0x2174);
 for(let i=0;i<shelfIterations;i++){
  const layout=shelfTrial(p,jobs,shelfRng);if(!layout||(best&&layout.sheets.length>best.metrics.sheets))continue;
  accept(layout,makeExamPlan(p,layout,profile.baseProfile),{kind:'bounded-shelves',iteration:i},null);
 }
 // Bounded post-optimization of distinct nondominated geometries, preserving
 // the unmodified order as an alternative. No arbitrary reorder can bypass CUT.
 const seeds=pareto.slice().sort((a,b)=>lex(score(a),score(b))).slice(0,postprocessLimit);
 const seen=new Set();
 for(const seedLayout of seeds)for(const sorting of ['original','size-desc','size-asc','utilization','narrow-centre']){
  const layout=sortStrips(seedLayout,p.kerf,sorting);
  const signature=JSON.stringify(layout.sheets.map(s=>s.tree));if(seen.has(signature))continue;seen.add(signature);
  const plan=makeExamPlan(p,layout,profile.baseProfile);
  for(const strategy of ['original','size-desc','size-asc','utilization','settings']){
   const scheduled=schedulePlan(plan,layout,{strategy,lookahead:options.lookahead??2,nodeBudget:options.schedulerNodeBudget??10000});
   stats.postprocessed++;
   accept(layout,scheduled.plan,{kind:'sorted-scheduled',source:seedLayout.provenance,sorting,strategy},scheduled.search);
  }
 }
 if(!best)throw Error('No feasible result found in ancestry profile and budget; infeasibility not proven');
 stats.elapsedMs=Date.now()-started;best.search=stats;
 return {best,pareto:pareto.sort((a,b)=>lex(score(a),score(b))),search:stats};
}
module.exports={optimizeTechnology,score};