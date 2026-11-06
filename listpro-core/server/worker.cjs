'use strict';
const {parentPort,workerData}=require('node:worker_threads'),engine=require('../web/engine.cjs'),learning=require('../src/cutting-experience'),store=require('../desktop-demo/experience-store.cjs');
try{
 const p=workerData.input,bank=learning.normalize(store.read(workerData.memoryPath));
 const result=engine.arrange(engine.solve(p,{experience:bank,examples:[],iterations:100,seed:42,objective:p.objective,progress:data=>parentPort.postMessage({type:'progress',data})}),p.partOrder);
 try{const next=store.update(workerData.memoryPath,fresh=>learning.remember(fresh,result.parameters,result));result.experienceInfo={...result.experienceInfo,patterns:next.patterns.length,solves:next.solves,saved:true};}catch{result.experienceInfo={...result.experienceInfo,saved:false};}
 result.parameters.pieces.forEach((a,i)=>a.edges=p.pieces[i].edges);result.material=p.material;result.thickness=p.thickness;
 const json=JSON.stringify(result);if(Buffer.byteLength(json)>12*1024*1024)throw Error('Результат слишком большой для текущей серверной версии. Разделите заказ.');
 parentPort.postMessage({type:'result',json});
}catch(e){parentPort.postMessage({type:'error',message:e.message});}
