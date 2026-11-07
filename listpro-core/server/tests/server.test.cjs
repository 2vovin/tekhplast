'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{once}=require('node:events');
const {createService}=require('../main.cjs'),{build}=require('../scripts/build.cjs');
async function fixture(fn,options={}){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-server-')),salt=crypto.randomBytes(16).toString('hex'),pass='test-private-owner-password',hash=crypto.scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');build();const s=createService({user:'owner',salt,hash,dataDir,...options});s.server.listen(0,'127.0.0.1');await once(s.server,'listening');const url='http://127.0.0.1:'+s.server.address().port,auth='Basic '+Buffer.from('owner:'+pass).toString('base64');try{await fn({url,auth,dataDir});}finally{await s.close();fs.rmSync(dataDir,{recursive:true,force:true});}}
const input={sheetW:1200,sheetH:900,trim:10,kerf:5,thickness:4,material:'Стекло',pieces:[{l:1100,w:800,q:3,grain:false}]};
test('server UI has no examples or optimizer source; full maps/printing remain available',()=>{const b=build();assert(!b.html.includes('data-example='));assert(!b.app.includes('new Worker('));assert(!b.html.includes('factories='));assert(b.app.includes("fetch(url"));assert(b.app.includes('window.print()'));assert(!b.html.includes('demo-blurred'));});
test('service refuses to start with missing authentication',()=>assert.throws(()=>createService({}),/Configure/));
test('authenticated API performs actual server calculation, persists experience, rejects CSRF and never serves optimizer source',async()=>fixture(async({url,auth,dataDir})=>{
 assert.equal((await fetch(url+'/')).status,401);const health=await(await fetch(url+'/healthz')).json();assert.equal(health.searchPipeline,'progressive-native-5-15-30');assert.equal(health.storedWasteRecovery,true);assert.equal(typeof health.nativeInterpreterPresent,'boolean');
 assert.equal((await fetch(url+'/src/cutting-experience.js',{headers:{authorization:auth}})).status,404);
 assert.equal((await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json',origin:'https://evil.invalid'},body:JSON.stringify(input)})).status,403);
 async function solve(){const response=await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,202);const {id}=await response.json();for(let i=0;i<200;i++){const state=await(await fetch(url+'/api/jobs/'+id,{headers:{authorization:auth}})).json();if(state.status==='done')return state.result;if(state.status==='failed')throw Error(state.error);await new Promise(r=>setTimeout(r,20));}throw Error('Timeout');}
 const a=await solve();assert.equal(a.metrics.sheets,3);assert.equal(a.sheets[2].parts.length,1);assert(fs.existsSync(path.join(dataDir,'experience-completed-v1.json')));const b=await solve();assert.equal(b.experienceInfo.used,true);assert(b.experienceInfo.solves>=2);
}));
test('queue capacity is bounded and active/queued jobs can be cancelled',async()=>fixture(async({url,auth})=>{
 const request=async()=>fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify({...input,pieces:[{l:1100,w:800,q:1000,grain:false}]})});const ids=[];
 for(let i=0;i<4;i++){const r=await request();assert.equal(r.status,202);ids.push((await r.json()).id);}
 assert.equal((await request()).status,429);
 for(const id of ids){const r=await fetch(url+'/api/jobs/'+id,{method:'DELETE',headers:{authorization:auth}});assert.equal(r.status,202);const state=await(await fetch(url+'/api/jobs/'+id,{headers:{authorization:auth}})).json();assert.equal(state.status,'cancelled');}
}));
test('release packaging excludes customer datasets and the client cannot fetch source files',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-stage-'));try{const files=require('../scripts/stage.cjs').stage(tmp);assert(!files.some(f=>f.startsWith('benchmarks/')));assert(files.includes('src/cutting-experience.js'));assert(files.includes('src/packing-pss.js'));assert(files.includes('server/packing/run.py'));assert(files.includes('server/packing/pin.json'));assert(files.includes('server/native-search.cjs'));assert.equal(typeof require(path.join(tmp,'server/native-search.cjs')).searchNative,'function');assert(files.includes('src/completed-rip-recovery.js'));assert.equal(typeof require(path.join(tmp,'src/completed-rip-recovery.js')).extendStoredBooks,'function');assert(files.includes('server/scripts/install-packing.sh'));assert(files.includes('scripts/self-train-experience.js'));assert(!fs.readFileSync(path.join(tmp,'server/dist/index.html'),'utf8').includes('factories='));}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('large order timeout returns a full independently replayable checkpoint, not an empty screen',async()=>fixture(async({url,auth,dataDir})=>{
 const input=require('./fixtures/order-229.json');
 const response=await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(input)});
 assert.equal(response.status,202);const {id}=await response.json();let state,preview;
 for(let i=0;i<400;i++){
  state=await(await fetch(url+'/api/jobs/'+id+'?after=0',{headers:{authorization:auth}})).json();
  if(!preview&&state.status==='running'&&state.result){
   preview=state;assert.equal(state.searchComplete,false);assert(state.revision>0);assert(state.timing.firstVerifiedMs>=0);
   assert.equal(state.result.metrics.parts,229);require('../../src/completed-rip-validator').validateCompleted(state.result.parameters,state.result,state.result.plan,state.result.equipmentProfile);
   const unchanged=await(await fetch(url+'/api/jobs/'+id+'?after='+state.revision,{headers:{authorization:auth}})).json();
   if(unchanged.status==='running'&&unchanged.revision===state.revision)assert.equal(unchanged.result,undefined);
  }
  if(['done','failed'].includes(state.status))break;await new Promise(r=>setTimeout(r,50));
 }
 assert(preview,'A complete checked map must be available while optimization is running');
 assert.equal(state.status,'done',state.error);assert.equal(state.searchComplete,false);assert.match(state.warning,/Оптимизация не завершена/);
 const r=state.result;assert.equal(r.sheets.reduce((n,s)=>n+s.parts.length,0),229);assert.equal(r.parameters.pieces.length,100);
 assert.deepEqual(r.parameters.pieces.map(p=>[p.l,p.w,p.q,p.grain]),input.pieces.map(p=>[p.l,p.w,p.q,p.grain]));
 assert.equal(r.experienceInfo.saved,true);assert.match(state.warning,/добавлен в базу опыта/);
 const bank=JSON.parse(fs.readFileSync(path.join(dataDir,'experience-completed-v1.json'),'utf8'));assert(bank.books.length>0);
 const reused=require('../../src/completed-rip-experience').solveWithExperience(r.parameters,bank,()=>{throw Error('Unexpected search');},{completeBooksOnly:true});assert(reused);assert(reused.metrics.sheets<=r.metrics.sheets);
 const engine=require('../../web/engine.cjs');assert.equal(engine.verify(r.parameters,r).metrics.sheets,r.metrics.sheets);
 if(r.model==='completed-rip-v1')require('../../src/completed-rip-validator').validateCompleted(r.parameters,r,r.plan,r.equipmentProfile);
 else if(r.model==='deferred-staged-v1')require('../../src/deferred-strip-validator').validateDeferred(r.parameters,r,r.plan,r.equipmentProfile);
 else require('../../src/held-strip-validator').validateHeld(r.parameters,r,r.plan,r.equipmentProfile);
}, {timeoutMs:15000}));
test('cancelling after the first preview keeps verified experience and stops the job',async()=>fixture(async({url,auth,dataDir})=>{
 const response=await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(require('./fixtures/order-229.json'))});
 const {id}=await response.json();let preview;
 for(let i=0;i<200;i++){
  const state=await(await fetch(url+'/api/jobs/'+id+'?after=0',{headers:{authorization:auth}})).json();
  if(state.status==='running'&&state.result){preview=state.result;break;}
  if(state.status==='failed')throw Error(state.error);await new Promise(r=>setTimeout(r,30));
 }
 assert(preview);assert.equal(preview.metrics.parts,229);
 assert.equal((await fetch(url+'/api/jobs/'+id,{method:'DELETE',headers:{authorization:auth}})).status,202);
 const stopped=await(await fetch(url+'/api/jobs/'+id+'?after=0',{headers:{authorization:auth}})).json();assert.equal(stopped.status,'cancelled');assert.equal(stopped.result,undefined);
 const bank=JSON.parse(fs.readFileSync(path.join(dataDir,'experience-completed-v1.json'),'utf8'));
 const recovered=require('../../src/completed-rip-experience').solveWithExperience(preview.parameters,bank,()=>{throw Error('Should only replay stored plan');},{completeBooksOnly:true});
 assert.equal(recovered.metrics.parts,229);
}));
test('timeout before any valid candidate is an explicit failure',async()=>fixture(async({url,auth})=>{
 const response=await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(input)});const {id}=await response.json();
 await new Promise(r=>setTimeout(r,100));const state=await(await fetch(url+'/api/jobs/'+id,{headers:{authorization:auth}})).json();assert.equal(state.status,'failed');assert.match(state.error,/Проверенная карта ещё не получена/);assert.equal(state.result,undefined);
},{timeoutMs:1}));
test('packaged release worker contains the completed-series optimizer and its dependencies',async()=>{
 const {Worker}=require('node:worker_threads'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-runtime-check-'));
 try{require('../scripts/stage.cjs').stage(tmp);const w=new Worker(path.join(tmp,'server/worker.cjs'),{workerData:{input,memoryPath:path.join(tmp,'bank.json')}});
 try{const r=await new Promise((resolve,reject)=>{w.on('error',reject);w.on('message',m=>{if(m.type==='result')resolve(JSON.parse(m.json));if(m.type==='error')reject(Error(m.message));});});assert.equal(r.model,'completed-rip-v1');assert.equal(r.metrics.parts,3);}finally{await w.terminate();}}
 finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('229-part stored opening is replayed before fresh search even with a 1ms search budget',async()=>{
 const {Worker}=require('node:worker_threads'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-book-first-')),r=require('../../benchmarks/order-229-completed-rip/result.json'),learning=require('../../src/completed-rip-experience'),memoryPath=path.join(dir,'bank.json');
 fs.writeFileSync(memoryPath,JSON.stringify(learning.remember(learning.empty(),r.parameters,r)));
 const w=new Worker(path.join(__dirname,'../worker.cjs'),{workerData:{input:r.parameters,memoryPath,searchBudgetMs:1}});
 try{const result=await new Promise((resolve,reject)=>{w.on('error',reject);w.on('message',m=>{if(m.type==='error')reject(Error(m.message));if(m.type==='result')resolve(JSON.parse(m.json));});});assert.equal(result.metrics.parts,229);assert.equal(result.metrics.sheets,15);assert.equal(result.experienceInfo.used,true);assert.equal(result.experienceInfo.saved,true);assert.equal(result.search.trials,undefined);}
 finally{await w.terminate();fs.rmSync(dir,{recursive:true,force:true});}
});

test('database write failure preserves a valid map and reports saved=false',async()=>fixture(async({url,auth,dataDir})=>{
 fs.mkdirSync(path.join(dataDir,'experience-completed-v1.json'));
 const response=await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(input)});const {id}=await response.json();let state;
 for(let i=0;i<200;i++){state=await(await fetch(url+'/api/jobs/'+id,{headers:{authorization:auth}})).json();if(['done','failed'].includes(state.status))break;await new Promise(r=>setTimeout(r,20));}
 assert.equal(state.status,'done',state.error);assert.equal(state.result.experienceInfo.saved,false);assert(state.result.experienceInfo.saveError);assert.equal(state.result.metrics.parts,3);
}));
