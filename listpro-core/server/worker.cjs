'use strict';
const {parentPort,workerData}=require('node:worker_threads'),engine=require('../web/engine.cjs'),learning=require('../src/cutting-experience'),store=require('../desktop-demo/experience-store.cjs');
const started=Date.now(),p=workerData.input,original=engine.clean(p);let best=null;
const score=r=>p.objective==='cuts'?[r.metrics.sheets,r.metrics.cuts,r.metrics.turns,-r.metrics.largestWaste]:[r.metrics.sheets,-r.metrics.largestWaste,r.metrics.cuts,r.metrics.turns];
const better=(a,b)=>!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((n,j)=>n===b[j]));
function encode(r){const json=JSON.stringify(r);if(Buffer.byteLength(json)>12*1024*1024)throw Error('Результат слишком большой для текущей серверной версии. Разделите заказ.');return json;}
function annotate(r){r.parameters.pieces.forEach((a,i)=>a.edges=p.pieces[i].edges);r.material=p.material;r.thickness=p.thickness;return r;}
function checkpoint(candidate){
 // Experience search also solves partial orders. Never publish those as a full map.
 if(!engine.equalOrder(original,candidate.parameters))return;
 const r=annotate(engine.arrange(candidate,p.partOrder));
 if(!better(score(r),best&&score(best)))return;
 r.experienceInfo={...r.experienceInfo,saved:false};
 const json=encode(r);best=r;
 parentPort.postMessage({type:'checkpoint',json,sheets:r.metrics.sheets});
}
try{
 const bank=learning.normalize(store.read(workerData.memoryPath));
 const progress=data=>parentPort.postMessage({type:'progress',data});
 // Obtain a complete independently validated fallback before expensive experience/LNS search.
 checkpoint(engine.solve(p,{examples:[],iterations:1,seed:42,objective:p.objective,onBest:checkpoint,progress}));
 const solved=engine.solve(p,{experience:bank,examples:[],iterations:100,seed:42,objective:p.objective,onBest:checkpoint,progress});
 checkpoint(solved);
 if(!best)throw Error('Проверенная карта полного заказа не найдена.');
 // Keep experience diagnostics when the final solution ties the saved incumbent.
 if(!better(score(best),score(solved)))best.experienceInfo={...solved.experienceInfo,saved:false};
 best.search={...best.search,serverElapsedMs:Date.now()-started};
 try{const next=store.update(workerData.memoryPath,fresh=>learning.remember(fresh,best.parameters,best));best.experienceInfo={...best.experienceInfo,patterns:next.patterns.length,solves:next.solves,saved:true};}catch{best.experienceInfo={...best.experienceInfo,saved:false};}
 parentPort.postMessage({type:'result',json:encode(best)});
}catch(e){parentPort.postMessage({type:'error',message:e.message});}
