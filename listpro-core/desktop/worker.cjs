'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {calculate}=require('./engine.cjs');
try{
 const result=calculate(workerData,{
  iterations:100,
  onProgress:data=>parentPort.postMessage({kind:'progress',data})
 });
 parentPort.postMessage({kind:'result',data:result});
}catch(e){
 parentPort.postMessage({kind:'error',error:String(e?.message||e)});
}
