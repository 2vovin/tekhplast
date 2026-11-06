'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{once}=require('node:events');
const {createService}=require('../main.cjs'),{build}=require('../scripts/build.cjs');
async function fixture(fn){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-server-')),salt=crypto.randomBytes(16).toString('hex'),pass='test-private-owner-password',hash=crypto.scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');build();const s=createService({user:'owner',salt,hash,dataDir});s.server.listen(0,'127.0.0.1');await once(s.server,'listening');const url='http://127.0.0.1:'+s.server.address().port,auth='Basic '+Buffer.from('owner:'+pass).toString('base64');try{await fn({url,auth,dataDir});}finally{await s.close();fs.rmSync(dataDir,{recursive:true,force:true});}}
const input={sheetW:1200,sheetH:900,trim:10,kerf:5,thickness:4,material:'Стекло',pieces:[{l:1100,w:800,q:3,grain:false}]};
test('server UI has no examples or optimizer source; full maps/printing remain available',()=>{const b=build();assert(!b.html.includes('data-example='));assert(!b.app.includes('new Worker('));assert(!b.html.includes('factories='));assert(b.app.includes("fetch(url"));assert(b.app.includes('window.print()'));assert(!b.html.includes('demo-blurred'));});
test('service refuses to start with missing authentication',()=>assert.throws(()=>createService({}),/Configure/));
test('authenticated API performs actual server calculation, persists experience, rejects CSRF and never serves optimizer source',async()=>fixture(async({url,auth,dataDir})=>{
 assert.equal((await fetch(url+'/')).status,401);assert.equal((await fetch(url+'/healthz')).status,200);
 assert.equal((await fetch(url+'/src/cutting-experience.js',{headers:{authorization:auth}})).status,404);
 assert.equal((await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json',origin:'https://evil.invalid'},body:JSON.stringify(input)})).status,403);
 async function solve(){const response=await fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,202);const {id}=await response.json();for(let i=0;i<200;i++){const state=await(await fetch(url+'/api/jobs/'+id,{headers:{authorization:auth}})).json();if(state.status==='done')return state.result;if(state.status==='failed')throw Error(state.error);await new Promise(r=>setTimeout(r,20));}throw Error('Timeout');}
 const a=await solve();assert.equal(a.metrics.sheets,3);assert.equal(a.sheets[2].parts.length,1);assert(fs.existsSync(path.join(dataDir,'experience-v1.json')));const b=await solve();assert.equal(b.experienceInfo.used,true);assert.equal(b.experienceInfo.solves,2);
}));
test('queue capacity is bounded and active/queued jobs can be cancelled',async()=>fixture(async({url,auth})=>{
 const request=async()=>fetch(url+'/api/jobs',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify({...input,pieces:[{l:1100,w:800,q:1000,grain:false}]})});const ids=[];
 for(let i=0;i<4;i++){const r=await request();assert.equal(r.status,202);ids.push((await r.json()).id);}
 assert.equal((await request()).status,429);
 for(const id of ids){const r=await fetch(url+'/api/jobs/'+id,{method:'DELETE',headers:{authorization:auth}});assert.equal(r.status,202);const state=await(await fetch(url+'/api/jobs/'+id,{headers:{authorization:auth}})).json();assert.equal(state.status,'cancelled');}
}));
test('release packaging excludes customer datasets and the client cannot fetch source files',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-stage-'));try{const files=require('../scripts/stage.cjs').stage(tmp);assert(!files.some(f=>f.startsWith('benchmarks/')));assert(files.includes('src/cutting-experience.js'));assert(files.includes('scripts/self-train-experience.js'));assert(!fs.readFileSync(path.join(tmp,'server/dist/index.html'),'utf8').includes('factories='));}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
