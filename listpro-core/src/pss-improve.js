'use strict';
const {checkInput}=require('./core');
const {rng}=require('./pss-candidates');
const {searchPSS}=require('./pss');
const {patternDP}=require('./pss-pattern-dp');
const {familyJobs,enumerateAnchors,allocateTails}=require('./pss-tail-allocation');
const {materializePSS,tailBins}=require('./pss-materialize');
const {validate}=require('./validator');
const {makePSSPlan}=require('./pss-plan');
const {validatePSS}=require('./pss-validator');
const clone=a=>JSON.parse(JSON.stringify(a));
const less=(a,b)=>!b||a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));
function score(m){return [m.sheets,-m.largestWaste,m.cuts,m.turns,m.cutLength,m.operations];}
function searchPSS13(p,options={}){
 const start=Date.now(),{jobs}=checkInput(p),profile=options.profile,random=rng(options.seed??1);
 if(!profile||profile.mode!=='PANEL_SAW_STAGED')throw Error('PSS equipment profile required');
 const defaults={baselineIterations:256,anchorLimit:4096,maxPatterns:256,dpStates:20000,frontier:32,
  dpPartitions:1000000,dpCombinations:10000000,allocationStates:2000,subsetLimit:20000,lnsIterations:200,maxFamilies:12};
 const budget={};for(const [k,v] of Object.entries(defaults)){budget[k]=options[k]??v;if(!Number.isSafeInteger(budget[k])||budget[k]<(k==='lnsIterations'?0:1))throw Error('Invalid PSS 1.3 budget: '+k);}
 const axes=profile.allowedPrimaryAxes.filter(a=>profile.machineCutAxes.includes(a)||profile.maxSheetTurns>0);
 if(!axes.length)throw Error('No executable primary axis');
 let best=null,bestScore=null;
 const stats={seed:options.seed??1,budget,baselineMs:0,anchorStates:0,anchorEnumerationExhausted:false,primaryPatterns:0,
  configurationAttempts:0,oneSheetAttempts:0,oneSheetValid:0,allocations:0,allocationNodes:0,allocationSubsets:0,
  allocationExhausted:0,technologyRejected:0,lastRejection:null,verifiedCandidates:0,lnsAttempts:0,
  destroyedParts:0,maxDestroyedParts:0,maxDestroyedStrips:0,crossStripMoves:0,improvements:[]};
 function consider(s,origin){
  try{
   const geometry=validate(p,s),plan=makePSSPlan(p,s,profile),verification=validatePSS(p,s,plan,profile),
    metrics={...geometry,...verification.metrics},value=score(metrics);
   stats.verifiedCandidates++;if(s.sheets.length===1)stats.oneSheetValid++;
   if(less(value,bestScore)){best={...s,plan,verification,metrics};bestScore=value;stats.improvements.push({origin,score:value.slice(),elapsedMs:Date.now()-start});}
   return value;
  }catch(e){stats.technologyRejected++;stats.lastRejection=e.message;return null;}
 }
 if(options.previous){
  // Never trust cached badges or silently repair a corrupted saved operation sequence.
  validatePSS(p,options.previous,options.previous.plan,profile);
  consider(clone(options.previous),'previous independently replayed');
 }
 if(!best){
  const s=searchPSS(p,{profile,iterations:budget.baselineIterations,seed:options.seed??1,refinements:4});
  consider(s,'PSS 1.2 seed');
 }
 stats.baselineMs=Date.now()-start;
 if(!best)throw Error('No independently verified initial solution');
 const families=familyJobs(jobs),totals=families.map(f=>f.jobs.length);
 const pool=[];
 function anchor(type,axis,rotated=false){const f=families[type],w=rotated?f.h:f.w,h=rotated?f.w:f.h;return {type,rotated,w:axis==='H'?h:w,h:axis==='H'?w:h};}
 function configsFrom(s){return s.sheets.map(sh=>({axis:sh.axis,anchors:sh.primaryStrips.map(a=>{
  const type=families.findIndex(f=>f.jobs.some(j=>j.id===a.anchor.id&&j.instance===a.anchor.instance));
  if(type<0)throw Error('Unknown anchor');return anchor(type,sh.axis,a.anchor.rotated);
 })}));}
 const seedConfigs=configsFrom(best);
 const maxW=p.sheetW-2*p.trim,maxH=p.sheetH-2*p.trim;
 const dp=patternDP(families,p.kerf,{maxW,maxH,maxArea:maxW*maxH,maxStates:budget.dpStates,
  frontier:budget.frontier,maxItems:jobs.length,maxPartitions:budget.dpPartitions,maxCombinations:budget.dpCombinations});
 const repairOptions={kerf:p.kerf,maxStates:budget.allocationStates,maxSubsets:budget.subsetLimit,random};
 function account(r){stats.allocationNodes+=r.stats.nodes;stats.allocationSubsets+=r.stats.subsets;if(r.stats.exhausted)stats.allocationExhausted++;}
 function tryConfig(configs,origin){
  stats.configurationAttempts++;if(configs.length===1)stats.oneSheetAttempts++;
  const counts=totals.slice();
  for(const c of configs){
   if(!axes.includes(c.axis)||!c.anchors.length)return;
   const cap=c.axis==='H'?maxH:maxW,long=c.axis==='H'?maxW:maxH;
   const sum=c.anchors.reduce((s,a)=>s+a.w+p.kerf,0)-p.kerf;
   if(sum>cap||(sum!==cap&&cap-sum<=p.kerf))return;
   for(const a of c.anchors){if(--counts[a.type]<0||a.h>long||(a.h!==long&&long-a.h<p.kerf))return;}
  }
  const bins=tailBins(p,configs),r=allocateTails(families,bins,counts,dp,repairOptions);account(r);
  if(!r.allocation)return;
  evaluate(configs,r.allocation,origin);
 }
 function evaluate(configs,allocation,origin){
  stats.allocations++;
  let s;try{s=materializePSS(p,families,configs,allocation,random);}catch(e){stats.lastRejection=e.message;return;}
  const value=consider(s,origin);
  if(value){
   pool.push({configs:clone(configs),allocation,value});
   pool.sort((a,b)=>less(a.value,b.value)?-1:less(b.value,a.value)?1:0);
   // Keep several different primary configurations to support deep exploration.
   const unique=[],seen=new Set();
   for(const a of pool){const key=JSON.stringify([a.configs,a.allocation.map(x=>x.counts)]);if(!seen.has(key)){seen.add(key);unique.push(a);}}
   pool.splice(0,pool.length,...unique.slice(0,12));
  }
 }
 if(families.length<=budget.maxFamilies){
  tryConfig(seedConfigs,'repack all seed tails');
  for(let si=0;si<seedConfigs.length;si++)for(const axis of axes){
   const configs=clone(seedConfigs);configs[si]={axis,anchors:configs[si].anchors.map(a=>anchor(a.type,axis,a.rotated))};
   tryConfig(configs,'independent sheet axis');
  }
  const patterns=[];
  for(const axis of axes){
   const e=enumerateAnchors(p,families,axis,budget.anchorLimit);
   stats.anchorStates+=e.visited;stats.anchorEnumerationExhausted||=e.exhausted;
   patterns.push(...e.patterns.map(a=>({axis:a.axis,anchors:a.anchors})));
  }
  stats.primaryPatterns=patterns.length;
  for(const config of patterns.slice(0,budget.maxPatterns))tryConfig([config],'one-sheet primary enumeration + count DP');
  // Spill strip widths are also single REAL parts, with their own genuine instance.
  // Mix axes across sheets, something the PSS 1.2 constructor could not do.
  if(best.sheets.length>1){
   const spill=families.flatMap((f,i)=>axes.map(axis=>({axis,anchors:[anchor(i,axis)]})))
    .sort((a,b)=>a.anchors[0].w*(a.axis==='H'?maxW:maxH)-b.anchors[0].w*(b.axis==='H'?maxW:maxH)).slice(0,4);
   for(const config of patterns.slice(0,budget.maxPatterns))for(const second of spill)tryConfig([config,second],'primary enumeration + real spill strip');
  }
  for(let iteration=0;iteration<budget.lnsIterations&&pool.length;iteration++){
   stats.lnsAttempts++;
   const base=pool[Math.floor(random()*pool.length)],bins=tailBins(p,base.configs),n=bins.length;
   if(n<2)continue;
   // Destroy whole groups from 2..all strips; keep unselected tail trees intact.
   const order=bins.map((_,i)=>({i,rank:random()})).sort((a,b)=>a.rank-b.rank).map(a=>a.i),
    size=2+Math.floor(random()*(n-1)),selected=order.slice(0,size),counts=totals.map(()=>0);
   for(const i of selected)base.allocation[i].counts.forEach((c,j)=>counts[j]+=c);
   const destroyed=counts.reduce((s,c)=>s+c,0);stats.destroyedParts+=destroyed;
   stats.maxDestroyedParts=Math.max(stats.maxDestroyedParts,destroyed);stats.maxDestroyedStrips=Math.max(stats.maxDestroyedStrips,size);
   const r=allocateTails(families,selected.map(i=>bins[i]),counts,dp,{...repairOptions,randomize:true});account(r);if(!r.allocation)continue;
   const allocation=base.allocation.slice();
   r.allocation.forEach((a,i)=>{const target=selected[i];stats.crossStripMoves+=a.counts.reduce((s,c,j)=>s+Math.max(0,c-base.allocation[target].counts[j]),0);allocation[target]={...a,index:target};});
   let configs=clone(base.configs);
   // Reorder actual anchored strips together with their tails. No composite anchor.
   if(iteration%4===0){
    let offset=0;
    for(const c of configs){
     const indices=c.anchors.map((_,i)=>({i,rank:random()})).sort((a,b)=>a.rank-b.rank).map(a=>a.i),
      aa=c.anchors.slice(),old=allocation.slice(offset,offset+c.anchors.length);
     c.anchors=indices.map(i=>aa[i]);indices.forEach((j,i)=>allocation[offset+i]={...old[j],index:offset+i});offset+=indices.length;
    }
   }
   evaluate(configs,allocation,'LNS destroy/repair '+size+' strips');
  }
 }else stats.dpSkipped='Too many distinct size/grain families for bounded count DP';
 stats.dp={...dp.stats};stats.elapsedMs=Date.now()-start;
 best.version='1.3';best.method='PSS-1.3-count-vector-DP-multi-strip-LNS';best.optimality='not proven';
 best.parameters=clone(p);best.equipmentProfile=clone(profile);best.search=stats;
 // Final replay before return/persistence, including the fallback/previous solution.
 best.verification=validatePSS(p,best,best.plan,profile);
 return best;
}
module.exports={searchPSS13};
