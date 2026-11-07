'use strict';
const {createService}=require('../main.cjs'),{once}=require('node:events'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-preview-bench-')),pass='temporary-benchmark-password',salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');
 const service=createService({user:'owner',salt,hash,dataDir:dir,searchBudgetMs:8000,timeoutMs:12000});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 const url='http://127.0.0.1:'+service.server.address().port,headers={authorization:'Basic '+Buffer.from('owner:'+pass).toString('base64'),'content-type':'application/json'};
 async function run(name,input,stopOnPreview=false){
  const start=Date.now(),created=await fetch(url+'/api/jobs',{method:'POST',headers,body:JSON.stringify({...input,material:'Листовой материал',thickness:16})});assert.equal(created.status,202);
  const {id}=await created.json();let revision=0,firstMapMs=null,firstVerifiedMs=null,legacyMapMs=null,last,unchangedBytes=0;const checkpoints=[];
  for(let tries=0;tries<500;tries++){
   const response=await fetch(url+'/api/jobs/'+id+'?after='+revision,{headers}),body=await response.text(),state=JSON.parse(body);
   if(state.result){
    firstMapMs??=Date.now()-start;firstVerifiedMs??=state.timing.firstVerifiedMs;
    const r=state.result;require('../../src/completed-rip-validator').validateCompleted(r.parameters,r,r.plan,r.equipmentProfile);
    assert.equal(r.metrics.parts,input.pieces.reduce((s,p)=>s+p.q,0));last=r;
    checkpoints.push({ms:Date.now()-start,revision:state.revision,status:state.status,sheets:r.metrics.sheets,experienceUsed:!!r.experienceInfo?.used});revision=state.revision;
   }else unchangedBytes=Math.max(unchangedBytes,Buffer.byteLength(body));
   if(stopOnPreview&&state.result&&state.status==='running'){await fetch(url+'/api/jobs/'+id,{method:'DELETE',headers});break;}
   if(state.status==='done'){legacyMapMs=Date.now()-start;break;}
   if(state.status==='failed')throw Error(state.error);await new Promise(r=>setTimeout(r,100));
  }
  assert(last);const report={name,parts:last.metrics.parts,firstVerifiedMs,firstMapMs,legacyMapMs,firstSheets:checkpoints[0].sheets,lastSheets:last.metrics.sheets,unchangedResponseMaxBytes:unchangedBytes,checkpoints};console.log(JSON.stringify(report));return report;
 }
 try{
  const input=require('../../benchmarks/order-127-target16/input.json');
  const cold=await run('127-cold',input),warm=await run('127-warm',input,true);
  const report={host:{node:process.version,cpus:os.availableParallelism(),platform:process.platform},searchBudgetMs:8000,hardTimeoutMs:12000,pollMs:100,cases:[cold,warm]};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 }finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
