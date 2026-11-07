'use strict';
const {createService}=require('../main.cjs'),{once}=require('node:events'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const reference=require('../../benchmarks/order-187-target16/result.json'),input=require('../../benchmarks/order-188-remnant/input.json'),learning=require('../../src/completed-rip-experience');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-added-api-')),password='temporary-added-part-password',salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex');
 fs.writeFileSync(path.join(dir,'experience-completed-v1.json'),JSON.stringify(learning.remember(learning.empty(),reference.parameters,reference)));
 const service=createService({user:'owner',salt,hash,dataDir:dir,searchBudgetMs:1500,timeoutMs:5000});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 try{
  const url='http://127.0.0.1:'+service.server.address().port,headers={authorization:'Basic '+Buffer.from('owner:'+password).toString('base64'),'content-type':'application/json'};
  async function run(p){
   const start=Date.now(),created=await fetch(url+'/api/jobs',{method:'POST',headers,body:JSON.stringify({...p,material:'Листовой материал',thickness:16})});assert.equal(created.status,202);const {id}=await created.json();let state;
   for(let i=0;i<300;i++){state=await(await fetch(url+'/api/jobs/'+id+'?after=0',{headers})).json();if(state.status==='done')break;if(state.status==='failed')throw Error(state.error);await new Promise(r=>setTimeout(r,25));}
   assert.equal(state.status,'done');const result=state.result;require('../../src/completed-rip-validator').validateCompleted(result.parameters,result,result.plan,result.equipmentProfile);assert.equal(result.metrics.sheets,16);assert.equal(result.experienceInfo.saved,true);assert.equal(result.search.nativeTrials.length,0);return{result,elapsedMs:Date.now()-start};
  }
  const before=await run(reference.parameters),after=await run(input),added=after.result.sheets.flatMap(s=>s.parts.map(a=>({...a,sheet:s}))).find(a=>a.id===100);
  assert.equal(before.result.metrics.parts,187);assert.equal(after.result.metrics.parts,188);assert.equal(after.result.learningMove,'stored-waste-fill');assert.equal(after.result.recovery.placed,1);assert.deepEqual([added.x,added.y,added.w,added.h],[10,1445,2700,370]);
  before.result.sheets.forEach((sh,i)=>sh.parts.forEach(a=>assert(after.result.sheets[i].parts.some(b=>['x','y','w','h'].every(k=>a[k]===b[k])))));
  const report={before:{parts:187,sheets:16,elapsedMs:before.elapsedMs},after:{parts:188,sheets:16,elapsedMs:after.elapsedMs,metrics:after.result.metrics,recovery:after.result.recovery,learningMove:after.result.learningMove,experienceSaved:after.result.experienceInfo.saved,nativeAttempts:0},added:{sheet:16,x:added.x,y:added.y,w:added.w,h:added.h},existingGeometryPreserved:true};
  if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});fs.writeFileSync(path.join(process.argv[2],'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(process.argv[2],'before-result.json'),JSON.stringify(before.result));fs.writeFileSync(path.join(process.argv[2],'result.json'),JSON.stringify(after.result));}console.log(JSON.stringify(report));
 }finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
