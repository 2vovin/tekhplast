'use strict';
const {Worker}=require('node:worker_threads'),{execFileSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const source=path.resolve(process.argv[2]||path.join(__dirname,'../../benchmarks/order-187-target16/result.json')),reference=JSON.parse(fs.readFileSync(source,'utf8')),dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-import-check-')),memoryPath=path.join(dir,'bank.json');let worker;
 try{
  execFileSync(process.execPath,[path.join(__dirname,'import-verified.cjs'),source,memoryPath]);
  const start=Date.now();worker=new Worker(path.join(__dirname,'../worker.cjs'),{workerData:{input:reference.parameters,memoryPath,searchBudgetMs:1}});
  const result=await new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',m=>{if(m.type==='error')reject(Error(m.message));if(m.type==='result')resolve(JSON.parse(m.json));});});
  require('../../src/completed-rip-validator').validateCompleted(result.parameters,result,result.plan,result.equipmentProfile);
  assert.equal(result.metrics.parts,reference.metrics.parts);assert.equal(result.metrics.sheets,reference.metrics.sheets);assert.equal(result.experienceInfo.used,true);assert.equal(result.search.nativeTrials.length,0);
  const report={parts:result.metrics.parts,sheets:result.metrics.sheets,elapsedMs:Date.now()-start,experienceUsed:true,freshNativeAttempts:0,independentlyReplayed:true};
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{if(worker)await worker.terminate();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
