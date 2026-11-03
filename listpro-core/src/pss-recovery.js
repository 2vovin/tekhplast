'use strict';
const {checkInput}=require('./core');
const {candidatePSS,rng}=require('./pss-candidates');
const {patternDP}=require('./pss-pattern-dp');
const {familyJobs,allocateTails}=require('./pss-tail-allocation');
const {searchPSS13}=require('./pss-improve');
const {validate}=require('./validator');
const {makePSSPlan}=require('./pss-plan');
const {validatePSS}=require('./pss-validator');
const {key,inside,at,replace,collect,wasteInventory,expandPattern,localPatterns}=require('./pss-waste-local');
const clone=x=>JSON.parse(JSON.stringify(x));
function recoveryScore(s){
 const areas=s.sheets.map(sh=>sh.parts.reduce((n,a)=>n+a.w*a.h,0));
 return [s.sheets.length,...areas.slice(1).reverse(),-s.metrics.largestWaste,s.metrics.cuts,s.metrics.turns,s.metrics.cutLength,s.metrics.operations];
}
function less(a,b){return a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));}
function recoverWaste(p,previous,options={}){
 const start=Date.now(),profile=options.profile,{jobs}=checkInput(p),lookup=new Map(jobs.map(a=>[key(a),a])),random=rng(options.seed??1);
 if(!profile||profile.mode!=='PANEL_SAW_STAGED')throw Error('PSS profile required');
 const budget={donorTrials:options.donorTrials??12,candidates:options.candidates??8,passes:options.passes??jobs.length,
  dpStates:options.dpStates??3000,combinations:options.combinations??500000,subsets:options.subsets??2000,frontier:options.frontier??32};
 for(const [k,v] of Object.entries(budget))if(!Number.isSafeInteger(v)||v<1)throw Error('Invalid recovery budget: '+k);
 for(const name of ['deepPasses','deepRegions','multiStates','multiCombinations','multiFrontier','multiPasses','multiSubsets','multiGroups','multiAttempts','multiAllocationStates','multiAllocationSubsets']){
  const value=options[name];if(value!==undefined&&(!Number.isSafeInteger(value)||value<(name.endsWith('Passes')?0:1)))throw Error('Invalid recovery budget: '+name);
 }
 const initialVerification=validatePSS(p,previous,previous.plan,profile);
 let best=clone(previous);best.verification=initialVerification;best.metrics={...validate(p,best),...initialVerification.metrics};
 const stats={budget,initialSheetLoads:best.sheets.map(s=>s.parts.length),options:Object.fromEntries(Object.entries(options).filter(([k])=>!['profile','previous'].includes(k))),inventories:[],leafAttempts:0,deepAttempts:0,multiStripAttempts:0,multiStripDP:null,multiStripNodes:0,multiStripBudgetExhausted:0,localStates:0,
  localExhausted:0,donorCandidates:0,replayRejected:0,lastRejection:null,accepted:[],elapsedMs:0};
 const axes=profile.allowedPrimaryAxes.filter(a=>profile.machineCutAxes.includes(a)||profile.maxSheetTurns>0);
 if(!axes.length)throw Error('No executable primary axis');
 function verify(s){
  collect(s);const geometry=validate(p,s),plan=makePSSPlan(p,s,profile),verification=validatePSS(p,s,plan,profile);
  return {...s,plan,verification,metrics:{...geometry,...verification.metrics},parameters:clone(p),equipmentProfile:clone(profile)};
 }
 function incoming(s,sheet){return s.sheets.slice(sheet+1).flatMap(sh=>sh.parts).map(a=>lookup.get(key(a)));}
 function repairDonors(base,patched,sheet,moved){
  const gone=new Set(moved.map(key)),remaining=incoming(base,sheet).filter(j=>!gone.has(key(j)));
  let chosen=null;
  for(let trial=0;trial<(remaining.length?budget.donorTrials:1);trial++){
   const order=remaining.map(j=>({j,rank:trial===0?-(j.l*j.w):-(j.l*j.w)*(0.1+random())})).sort((a,b)=>a.rank-b.rank).map(a=>a.j);
   const donor=remaining.length?candidatePSS(p,order,axes[trial%axes.length],random,trial):{sheets:[]};
   if(!donor)continue;
   const s={version:'1.4',mode:'PANEL_SAW_STAGED',sheets:[...clone(patched.sheets.slice(0,sheet+1)),...donor.sheets],optimality:'not proven'};
   stats.donorCandidates++;
   try{const result=verify(s);if(!chosen||less(recoveryScore(result),recoveryScore(chosen)))chosen=result;}
   catch(e){stats.replayRejected++;stats.lastRejection=e.message;}
  }
  return chosen;
 }
 function propose(base,region,mandatory){
  const pool=incoming(base,region.sheet);
  if(!pool.length)return null;
  const r=localPatterns(region.rect,mandatory,pool,p.kerf,budget);
  stats.localStates+=r.stats.dp.states;if(r.stats.dp.exhausted||r.stats.subsetExhausted)stats.localExhausted++;
  let chosen=null;
  for(const a of r.candidates.slice(0,budget.candidates))for(const padding of ['V','H']){
   const patched={sheets:clone(base.sheets)};
   replace(patched.sheets[region.sheet],region.path,expandPattern(a.pattern,region.rect,a.families,p.kerf,padding));
   const result=repairDonors(base,patched,region.sheet,a.moved);
   if(result&&less(recoveryScore(result),recoveryScore(base))&&(!chosen||less(recoveryScore(result),recoveryScore(chosen.result))))
    chosen={result,region,moved:a.moved.map(j=>({id:j.id,instance:j.instance})),mandatory:mandatory.length};
  }
  return chosen;
 }
 function accept(move,phase){
  const before=best.sheets.map(sh=>sh.parts.length);best=move.result;
  stats.accepted.push({phase,region:move.region,moved:move.moved,mandatory:move.mandatory,
   beforeSheetLoads:before,afterSheetLoads:best.sheets.map(sh=>sh.parts.length),score:recoveryScore(best)});
 }
 function leafPass(){
  const inventory=wasteInventory(best,best.verification);stats.inventories.push(inventory);
  let winner=null;
  for(const region of inventory){
   if(!region.eligible||region.sheet>=best.sheets.length-1)continue;
   stats.leafAttempts++;const m=propose(best,region,[]);
   if(m&&(!winner||less(recoveryScore(m.result),recoveryScore(winner.result))))winner=m;
  }
  if(winner)accept(winner,'existing-waste');return !!winner;
 }
 for(let n=0;n<budget.passes&&best.sheets.length>1;n++)if(!leafPass())break;
 if(options.deep){
  // Rebuild SECONDARY subtrees only, strictly behind the immutable leading anchor.
  for(let pass=0;pass<(options.deepPasses??2)&&best.sheets.length>1;pass++){
   let winner=null;
   for(let sheet=0;sheet<best.sheets.length-1;sheet++)for(const strip of best.sheets[sheet].primaryStrips){
    const root=at(best.sheets[sheet].tree,strip.path);
    if(root.kind!=='cut'||root.axis===strip.axis)continue;
    const regions=[];
    function walk(n,path){if(n.kind==='cut'){regions.push({sheet,path,rect:n.rect,strip:strip.index});walk(n.first,path+'/0');walk(n.second,path+'/1');}}
    walk(root.second,strip.path+'/1');
    for(const region of regions.slice(0,options.deepRegions??16)){
     const mandatory=best.sheets[sheet].parts.filter(a=>inside(a,region.rect)).map(a=>lookup.get(key(a)));
     stats.deepAttempts++;const m=propose(best,region,mandatory);
     if(m&&(!winner||less(recoveryScore(m.result),recoveryScore(winner.result))))winner=m;
    }
   }
   if(!winner)break;accept(winner,'secondary-subtree-rebuild');
   for(let n=0;n<budget.passes&&best.sheets.length>1;n++)if(!leafPass())break;
  }
 }

 if(options.multiStrip&&best.sheets.length>1){
  const families=familyJobs(jobs),typeOf=new Map(families.flatMap((f,i)=>f.jobs.map(j=>[key(j),i]))),
   dp=patternDP(families,p.kerf,{maxW:p.sheetW-2*p.trim,maxH:p.sheetH-2*p.trim,maxArea:(p.sheetW-2*p.trim)*(p.sheetH-2*p.trim),
    maxStates:options.multiStates??15000,maxCombinations:options.multiCombinations??20000000,maxPartitions:1000000,
    frontier:options.multiFrontier??64,maxItems:jobs.length,retainDominated:options.multiRetainDominated??false});
  for(let pass=0;pass<(options.multiPasses??2)&&best.sheets.length>1;pass++){
   let winner=null,attempts=0;
   for(let sheet=0;sheet<best.sheets.length-1;sheet++){
    const regions=best.sheets[sheet].primaryStrips.flatMap(strip=>{
     const root=at(best.sheets[sheet].tree,strip.path);
     return root.kind==='cut'&&root.axis!==strip.axis?[{sheet,path:strip.path+'/1',rect:root.second.rect,strip:strip.index}]:[];
    }),pool=incoming(best,sheet);
    // All later instances are actual order IDs, grouped only by size/grain.
    const laterFamilies=familyJobs(pool),incomingChoices=[],chosen=[];
    function subsets(i){if(incomingChoices.length>=(options.multiSubsets??128))return;
     if(i===laterFamilies.length){if(chosen.length)incomingChoices.push(chosen.slice());return;}
     const f=laterFamilies[i];for(let n=f.jobs.length;n>=0;n--){chosen.push(...f.jobs.slice(0,n));subsets(i+1);chosen.splice(chosen.length-n,n);}
    }subsets(0);
    incomingChoices.sort((a,b)=>b.reduce((s,j)=>s+j.l*j.w,0)-a.reduce((s,j)=>s+j.l*j.w,0));
    const groups=[];
    function groupsOf(start,selected){
     if(selected.length>=2)groups.push(selected.slice());
     if(groups.length>=(options.multiGroups??64))return;
     for(let i=start;i<regions.length;i++){selected.push(regions[i]);groupsOf(i+1,selected);selected.pop();if(groups.length>=(options.multiGroups??64))break;}
    }groupsOf(0,[]);groups.sort((a,b)=>b.length-a.length);
    for(const selected of groups)for(const moved of incomingChoices){
     if(attempts++>=(options.multiAttempts??128))break;stats.multiStripAttempts++;
     const mandatory=best.sheets[sheet].parts.filter(a=>selected.some(r=>inside(a,r.rect))).map(a=>lookup.get(key(a))),
      all=[...mandatory,...moved],counts=families.map(()=>0);
     for(const a of all)counts[typeOf.get(key(a))]++;
     const allocation=allocateTails(families,selected.map(a=>a.rect),counts,dp,{kerf:p.kerf,maxStates:options.multiAllocationStates??4000,maxSubsets:options.multiAllocationSubsets??50000,random});
     stats.multiStripNodes+=allocation.stats.nodes;if(allocation.stats.exhausted)stats.multiStripBudgetExhausted++;
     if(!allocation.allocation)continue;
     const queues=families.map(()=>[]);for(const a of all)queues[typeOf.get(key(a))].push(a);
     for(const padding of ['V','H']){
      const q=queues.map(a=>a.slice()),patched={sheets:clone(best.sheets)};
      allocation.allocation.forEach((a,i)=>{
       const ff=families.map((f,j)=>({...f,jobs:q[j].splice(0,a.counts[j])}));
       replace(patched.sheets[sheet],selected[i].path,expandPattern(a.pattern,selected[i].rect,ff,p.kerf,padding));
      });
      if(q.some(a=>a.length))throw Error('Multi-strip identity accounting');
      const result=repairDonors(best,patched,sheet,moved);
      if(result&&less(recoveryScore(result),recoveryScore(best))&&(!winner||less(recoveryScore(result),recoveryScore(winner.result))))
       winner={result,region:{sheet,strips:selected.map(a=>a.strip),paths:selected.map(a=>a.path)},moved:moved.map(j=>({id:j.id,instance:j.instance})),mandatory:mandatory.length};
     }
    }
   }
   if(!winner)break;accept(winner,'multi-strip-count-DP');
   for(let n=0;n<budget.passes&&best.sheets.length>1;n++)if(!leafPass())break;
  }
  stats.multiStripDP={...dp.stats};
 }

 stats.elapsedMs=Date.now()-start;stats.finalSheetLoads=best.sheets.map(sh=>sh.parts.length);
 best.version='1.4';best.method='PSS-1.4-physical-waste-recovery';best.recovery=stats;
 best.parameters=clone(p);best.equipmentProfile=clone(profile);best.optimality='not proven';
 best.verification=validatePSS(p,best,best.plan,profile);
 delete best.search;return best;
}
function searchPSS14(p,options={}){
 const previous=options.previous??searchPSS13(p,{...options,lnsIterations:options.lnsIterations??200});
 return recoverWaste(p,previous,{...options,deep:options.deep??true,multiStrip:options.multiStrip??true});
}
module.exports={recoverWaste,searchPSS14,recoveryScore};
