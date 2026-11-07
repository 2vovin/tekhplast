'use strict';
const {parentPort,workerData}=require('node:worker_threads'),engine=require('./optimizer.cjs'),learning=require('../src/completed-rip-experience'),store=require('../desktop-demo/experience-store.cjs'),{estimateSheets}=require('../src/sheet-area-estimate');
const nativeTrials=[],python=process.env.LISTPRO_PACKING_PYTHON||'/opt/listpro/packing/bin/python';let nativeEngineAvailable=require('node:fs').existsSync(python);
const started=Date.now(),deadline=started+(workerData.searchBudgetMs??240000),shouldStop=()=>Date.now()>=deadline,p=workerData.input,original=engine.clean(p),minimum=estimateSheets(original).minimumSheets;let best=null,recorded=false;
const score=r=>p.objective==='cuts'?[r.metrics.sheets,r.metrics.cuts,r.metrics.turns,-r.metrics.largestWaste]:[r.metrics.sheets,-r.metrics.largestWaste,r.metrics.cuts,r.metrics.turns];
const better=(a,b)=>!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((n,j)=>n===b[j]));
function encode(r){const json=JSON.stringify(r);if(Buffer.byteLength(json)>12*1024*1024)throw Error('Результат слишком большой для текущей серверной версии. Разделите заказ.');return json;}
function annotate(r){r.parameters.pieces.forEach((a,i)=>a.edges=p.pieces[i].edges);r.material=p.material;r.thickness=p.thickness;return r;}
function checkpoint(candidate){
 // Experience search also solves partial orders. Never publish those as a full map.
 if(!engine.equalOrder(original,candidate.parameters))return;
 const r=annotate(engine.arrange(candidate,p.partOrder));
 if(!better(score(r),best&&score(best)))return;
 r.sheetEstimate=estimateSheets(original,r.metrics.sheets);
 r.search={...r.search,nativeEngineAvailable,minimumSheetsByArea:minimum};
 r.experienceInfo={...r.experienceInfo,saved:false};
 encode(r);
 // Persist only independently replayed full-order improvements, before more search.
 try{const next=store.update(workerData.memoryPath,fresh=>learning.remember(fresh,r.parameters,r,{countSolve:!recorded}));recorded=true;r.experienceInfo={...r.experienceInfo,patterns:next.patterns.length,solves:next.solves,saved:true};}catch(e){r.experienceInfo={...r.experienceInfo,saved:false,saveError:e.message};}
 const json=encode(r);best=r;
 parentPort.postMessage({type:'checkpoint',json,sheets:r.metrics.sheets});
}
try{
 const bank=learning.normalize(store.read(workerData.memoryPath));
 const progress=data=>parentPort.postMessage({type:'progress',data});
 // Replay a complete matching book before spending time on fresh search.
 const opening=learning.solveWithExperience(original,bank,()=>{throw Error('Opening lookup must not search');},{completeBooksOnly:true,objective:p.objective});
 if(opening)checkpoint(opening);
 let solved=opening;
 if((!opening||opening.metrics.sheets>minimum)&&!shouldStop()){
  checkpoint(engine.solve(p,{examples:[],iterations:1,seed:42,objective:p.objective,onBest:checkpoint,progress,shouldStop}));
  if(best?.metrics.sheets>minimum&&!shouldStop()){
   const native=require('./native-search.cjs').searchNative(original,{python,deadline,minimum,getBest:()=>best,onCandidate:checkpoint,progress});
   nativeEngineAvailable=native.available;nativeTrials.push(...native.trials);
  }
  if(best?.metrics.sheets===minimum)solved=best;
  else if(!shouldStop())solved=engine.solve(p,{experience:bank,examples:[],iterations:100,seed:42,objective:p.objective,onBest:checkpoint,progress,shouldStop});
 }
 if(solved)checkpoint(solved);
 if(!best)throw Error('Проверенная карта полного заказа не найдена.');
 // Keep experience diagnostics when the final solution ties the saved incumbent.
 if(solved&&!better(score(best),score(solved)))best.experienceInfo={...solved.experienceInfo,...best.experienceInfo,used:!!solved.experienceInfo?.used};
 best.search={...best.search,serverElapsedMs:Date.now()-started,budgetExhausted:shouldStop(),nativeEngineAvailable,minimumSheetsByArea:minimum,nativeTrials};
 parentPort.postMessage({type:'result',json:encode(best)});
}catch(e){parentPort.postMessage({type:'error',message:e.message});}
