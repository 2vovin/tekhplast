'use strict';
const {parentPort,workerData}=require('node:worker_threads'),path=require('node:path');
const {present}=require('./policy.cjs');
try{
 const engine=require(path.join(workerData.coreBase,'web/engine.cjs'));
 const p=workerData.input,store=require('./experience-store.cjs'),learning=require(path.join(workerData.coreBase,'src/cutting-experience.js'));
 const bank=workerData.memoryPath?learning.normalize(store.read(workerData.memoryPath)):learning.empty();
 if(!Number.isFinite(Number(p.thickness))||Number(p.thickness)<=0||Number(p.thickness)>1000)throw Error('Укажите толщину материала от 0,1 до 1000 мм.');
 const result=engine.arrange(engine.solve(p,{objective:p.objective||'remnants',iterations:100,seed:42,examples:[],experience:bank,progress:data=>parentPort.postMessage({type:'progress',data})}),p.partOrder||'descending');
 if(workerData.memoryPath)try{const next=store.update(workerData.memoryPath,fresh=>learning.remember(fresh,result.parameters,result));result.experienceInfo={...result.experienceInfo,patterns:next.patterns.length,solves:next.solves,saved:true};}catch{result.experienceInfo={...result.experienceInfo,saved:false};}
 parentPort.postMessage({type:'result',result:present(result,p)});
}catch(e){parentPort.postMessage({type:'error',message:e.message});}
