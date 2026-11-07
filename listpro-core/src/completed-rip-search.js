'use strict';
const {searchAdaptive}=require('./completed-rip-candidates'),{fromTree}=require('./deferred-strip-patterns'),{compileCompleted}=require('./completed-rip'),{estimateSheets}=require('./sheet-area-estimate');
function searchCompleted(p,{iterations=100,seed=42,objective='remnants',progress=()=>{},onBest=()=>{},shouldStop=()=>false}={}){
 if(!Number.isInteger(iterations)||iterations<1||iterations>100||!Number.isInteger(seed))throw Error('Invalid search budget');
 let best=null;const trials=[],started=Date.now(),score=r=>objective==='cuts'?[r.metrics.sheets,r.metrics.cuts,r.metrics.turns,-r.metrics.largestWaste]:[r.metrics.sheets,-r.metrics.largestWaste,r.metrics.cuts,r.metrics.turns];
 function accept(layout){try{const r=compileCompleted(p,layout.sheets.map(s=>fromTree(s.tree,p.kerf))),a=score(r),b=best&&score(best);if(!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((v,j)=>v===b[j]))){r.sheetEstimate=estimateSheets(p,r.metrics.sheets);best=r;onBest(r);}return true;}catch{return false;}}
 // Preserve inexpensive conservative candidates as alternatives to the broader model.
 for(const candidates of [12,48])for(const axis of ['H','V'])try{
  if(shouldStop())break;
  const r=require('./adaptive-held-strip').searchAdaptive({...p,sheetW:p.sheetW+p.kerf,sheetH:p.sheetH+p.kerf},{iterations:1,seed,axis,candidates,accept});trials.push({...r.stats,kind:'conservative-seed'});
 }catch(e){trials.push({axis,candidates,kind:'conservative-seed',error:e.message});}
 for(const candidates of [12,48]){
  if(shouldStop())break;
  for(const axis of ['H','V']){if(shouldStop())break;progress({text:'Полосный поиск с завершением серий · '+axis+' · '+candidates+' вариантов',percent:candidates===12?(axis==='H'?10:35):(axis==='H'?65:85)});
   try{const r=searchAdaptive(p,{iterations,seed,axis,candidates,accept,shouldStop});trials.push(r.stats);}catch(e){trials.push({axis,candidates,error:e.message});}
  }
  if(best?.metrics.sheets===estimateSheets(p).minimumSheets)break;
 }
 if(!best)throw Error('Не найдена проверенная карта для модели завершённых серий.');
 best.search={budgetExhausted:shouldStop(),model:'completed-rip-v1',iterations,seed,trials,elapsedMs:Date.now()-started,optimality:best.metrics.sheets===estimateSheets(p).minimumSheets?'sheet-count area bound only':'not proven'};return best;
}
module.exports={searchCompleted};
