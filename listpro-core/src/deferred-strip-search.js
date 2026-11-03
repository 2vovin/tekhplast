'use strict';
const {fromTree,buildRawLayout,countParts}=require('./deferred-strip-patterns');
const {makeDeferredPlan}=require('./deferred-strip-plan');
const {validateDeferred}=require('./deferred-strip-validator');
function deferredProfile(){return{id:'deferred-held-strip-v1',retainedSide:'HIGH_MATERIAL',terminalPromotionAllowed:false,maxTurnsPerBlank:1,maxSheetTurns:0,initialCutAxes:['H','V'],allowTerminalBladeOverhang:true,realMachineFeasibility:'unknown'};}
function verifyDeferred(p,layout){const profile=deferredProfile(),plan=makeDeferredPlan(p,layout),verification=validateDeferred(p,layout,plan,profile);return{...layout,parameters:p,equipmentProfile:profile,plan,verification,metrics:verification.metrics};}
function optimizeDeferred(p,layouts,{objective='remnants',permutations=12,seed=42,nodeLimit=400,accept=()=>{}}={}){
 const started=Date.now(),patterns=layouts.map(s=>s.sheets.map(sh=>fromTree(sh.tree,p.kerf))),stats={model:'deferred-staged-v1',attempts:0,accepted:0,rejected:0,coverNodes:0,elapsedMs:0};let best=null;
 const score=s=>objective==='cuts'?[s.metrics.sheets,s.metrics.cuts,s.metrics.turns,-s.metrics.largestWaste]:[s.metrics.sheets,-s.metrics.largestWaste,s.metrics.cuts,s.metrics.turns];
 const better=(a,b)=>!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((v,j)=>v===b[j]));
 function attempt(pats,strategy,trialSeed){stats.attempts++;try{const s=verifyDeferred(p,buildRawLayout(p,pats,{strategy,seed:trialSeed}));stats.accepted++;if(better(score(s),best&&score(best))){best=s;accept(s);}}catch{stats.rejected++;}}
 for(const pats of patterns){for(let i=0;i<permutations;i++)attempt(pats,['anchor-last','size-desc','size-asc'][i]||'shuffle',seed+i);}
 // Bounded exact-cover search over complete sheet patterns. Each state is the
 // remaining multiplicity vector; H/V patterns may coexist in the same order.
 // This does not pretend that the pattern library is an exhaustive packing search.
 const ids=p.pieces.map(a=>a.id),seen=new Set(),pool=[];
 for(const pats of patterns)for(const n of pats){const counts=countParts(n),q=ids.map(id=>counts.get(id)||0),key=n.axis+':'+q.join(',');if(seen.has(key))continue;seen.add(key);pool.push({n,q,area:ids.reduce((s,id,i)=>{const a=p.pieces[i];return s+a.l*a.w*q[i];},0)});}
 pool.sort((a,b)=>b.area-a.area);const memo=new Map(),usable=(p.sheetW-2*p.trim)*(p.sheetH-2*p.trim);
 function cover(rem,chosen){
  if(++stats.coverNodes>nodeLimit)return;
  if(rem.every(n=>n===0)){attempt(chosen,'anchor-last',seed);return;}
  const area=rem.reduce((s,q,i)=>s+q*p.pieces[i].l*p.pieces[i].w,0);if(best&&chosen.length+Math.ceil(area/usable)>best.sheets.length)return;
  const key=rem.join(',');if((memo.get(key)??Infinity)<chosen.length)return;memo.set(key,chosen.length);
  let options=null;for(let i=0;i<rem.length;i++)if(rem[i]){const a=pool.filter(c=>c.q[i]&&c.q.every((q,j)=>q<=rem[j]));if(!a.length)return;if(!options||a.length<options.length)options=a;}
  for(const c of options){if(stats.coverNodes>=nodeLimit)break;cover(rem.map((q,i)=>q-c.q[i]),[...chosen,c.n]);}
 }
 cover(p.pieces.map(a=>a.q),[]);stats.elapsedMs=Date.now()-started;return{best,stats};
}
module.exports={deferredProfile,verifyDeferred,optimizeDeferred};
