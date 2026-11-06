'use strict';
// Run from listpro-core: node server/scripts/benchmark-order-229.cjs /tmp/order-229 300000
const {Worker}=require('node:worker_threads'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const input=require('../tests/fixtures/order-229.json'),out=path.resolve(process.argv[2]||'/tmp/listpro-order-229'),budget=Number(process.argv[3]||300000);
if(!Number.isInteger(budget)||budget<1000||budget>600000)throw Error('Budget: 1000–600000 ms');
fs.mkdirSync(out,{recursive:true});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-order229-bank-')),start=Date.now(),checkpoints=[];let best=null,complete=false,error=null;
const worker=new Worker(path.resolve(__dirname,'../worker.cjs'),{workerData:{input,memoryPath:path.join(dir,'experience.json')},resourceLimits:{maxOldGenerationSizeMb:768,stackSizeMb:16}});
const timer=setTimeout(()=>{error='time budget reached';worker.terminate();},budget);
worker.on('message',m=>{
 if(m.type==='checkpoint'||m.type==='result'){best=JSON.parse(m.json);checkpoints.push({elapsedMs:Date.now()-start,kind:m.type,sheets:best.metrics.sheets,cuts:best.metrics.cuts,turns:best.metrics.turns});}
 if(m.type==='result'){complete=true;worker.terminate();}if(m.type==='error'){error=m.message;worker.terminate();}
});worker.on('error',e=>error=e.message);
worker.on('exit',()=>{
 clearTimeout(timer);try{
  if(!best)throw Error(error||'No verified map');
  const v=best.model==='deferred-staged-v1'?require('../../src/deferred-strip-validator').validateDeferred(best.parameters,best,best.plan,best.equipmentProfile):require('../../src/held-strip-validator').validateHeld(best.parameters,best,best.plan,best.equipmentProfile);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(best));
  const report={budgetMs:budget,elapsedMs:Date.now()-start,searchComplete:complete,stopReason:error,checkpoints,metrics:v.metrics,geometryValid:v.geometryValid,targetPSSModelValid:v.targetPSSModelValid,realMachineFeasibility:v.realMachineFeasibility};fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }catch(e){console.error(e);process.exitCode=1;}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
