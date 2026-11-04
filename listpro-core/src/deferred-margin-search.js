'use strict';
const {estimateSheets}=require('./sheet-area-estimate');
const {searchAdaptive}=require('./adaptive-held-strip'),{fromTree,buildRawLayout}=require('./deferred-strip-patterns'),{verifyDeferred}=require('./deferred-strip-search');
// Candidate generation reserves one fewer terminal kerf. Only compilation and
// independent replay against the ORIGINAL sheet/trim/parts may accept a result.
function searchDeferredMargins(p,{iterations=100,seed=42,candidates=12,accept=()=>{}}={}){
 const stats={candidates,attempts:0,accepted:0,rejected:0,axes:[]},pool=[];
 for(const axis of ['H','V']){
  try{const t=searchAdaptive({...p,sheetW:p.sheetW+p.kerf,sheetH:p.sheetH+p.kerf},{iterations,axis,seed,candidates,accept:s=>{
   stats.attempts++;try{const patterns=s.sheets.map(sh=>fromTree(sh.tree,p.kerf));const r=verifyDeferred(p,buildRawLayout(p,patterns));stats.accepted++;pool.push(r);accept(r);return true;}catch{stats.rejected++;return false;}
  }});stats.axes.push(t.stats);}catch(e){stats.axes.push({axis,error:e.message});}
  if(pool.some(r=>r.metrics.sheets===estimateSheets(p).minimumSheets))break;
 }
 return {stats,layouts:pool};
}
module.exports={searchDeferredMargins};
