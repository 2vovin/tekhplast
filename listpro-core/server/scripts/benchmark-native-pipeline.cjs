'use strict';
// Exercise the production HTTP -> worker -> native -> arrangement -> learning path.
const {createService}=require('../main.cjs'),{once}=require('node:events'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const input=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'../../benchmarks/order-187-target16/input.json'),'utf8'));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-native-api-')),password='temporary-native-api-password',salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex');
 const service=createService({user:'owner',salt,hash,dataDir:dir});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 try{
  const url='http://127.0.0.1:'+service.server.address().port,headers={authorization:'Basic '+Buffer.from('owner:'+password).toString('base64'),'content-type':'application/json'},minimum=require('../../src/sheet-area-estimate').estimateSheets(input).minimumSheets;
  const health=await(await fetch(url+'/healthz')).json();assert.equal(health.nativeInterpreterPresent,true,'Install the native engine before this integration benchmark');
  const start=Date.now(),created=await fetch(url+'/api/jobs',{method:'POST',headers,body:JSON.stringify({...input,material:'Листовой материал',thickness:16})});assert.equal(created.status,202);const {id}=await created.json();let revision=0,result,state;const checkpoints=[];
  for(let attempt=0;attempt<4000;attempt++){
   state=await(await fetch(url+'/api/jobs/'+id+'?after='+revision,{headers})).json();
   if(state.result){result=state.result;revision=state.revision;checkpoints.push({ms:Date.now()-start,status:state.status,sheets:result.metrics.sheets,saved:result.experienceInfo?.saved});console.log(JSON.stringify(checkpoints.at(-1)));}
   if(state.status==='done')break;if(state.status==='failed')throw Error(state.error);await new Promise(r=>setTimeout(r,100));
  }
  assert.equal(state.status,'done');assert(result);const verification=require('../../src/completed-rip-validator').validateCompleted(result.parameters,result,result.plan,result.equipmentProfile);
  assert.equal(verification.metrics.parts,input.pieces.reduce((n,a)=>n+a.q,0));assert.equal(verification.metrics.sheets,minimum);assert.equal(result.experienceInfo.saved,true,result.experienceInfo.saveError);
  const bank=JSON.parse(fs.readFileSync(path.join(dir,'experience-completed-v1.json'),'utf8'));
  const opening=require('../../src/completed-rip-experience').solveWithExperience(result.parameters,bank,()=>{throw Error('Opening must replay without search');},{completeBooksOnly:true});assert.equal(opening.metrics.sheets,minimum);
  const report={health,elapsedMs:Date.now()-start,minimumSheets:minimum,metrics:verification.metrics,checkpoints,search:result.search,experienceSaved:result.experienceInfo.saved,replayedFromExperience:opening.metrics.sheets};
  if(process.argv[3]){fs.mkdirSync(process.argv[3],{recursive:true});fs.writeFileSync(path.join(process.argv[3],'result.json'),JSON.stringify(result));fs.writeFileSync(path.join(process.argv[3],'report.json'),JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report));
 }finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
