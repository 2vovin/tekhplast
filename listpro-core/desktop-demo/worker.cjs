'use strict';
const {parentPort,workerData}=require('node:worker_threads'),path=require('node:path');
const {present}=require('./policy.cjs');
try{
 const engine=require(path.join(workerData.coreBase,'web/engine.cjs'));
 const p=workerData.input;
 if(!Number.isFinite(Number(p.thickness))||Number(p.thickness)<=0||Number(p.thickness)>1000)throw Error('Укажите толщину материала от 0,1 до 1000 мм.');
 const result=engine.arrange(engine.solve(p,{objective:p.objective||'remnants',iterations:100,seed:42,examples:[],progress:data=>parentPort.postMessage({type:'progress',data})}),p.partOrder||'descending');
 parentPort.postMessage({type:'result',result:present(result,p)});
}catch(e){parentPort.postMessage({type:'error',message:e.message});}
