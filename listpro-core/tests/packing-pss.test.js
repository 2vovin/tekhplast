'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {convert,scaled,runPacking}=require('../src/packing-pss'),{validateCompleted}=require('../src/completed-rip-validator'),{clean}=require('../web/engine.cjs');
const p=clean(require('../benchmarks/bazis-26-corrected.json')),csv=fs.readFileSync(path.join(__dirname,'../benchmarks/packing-pss/corrected-26-certificate.csv'),'utf8');
const check=r=>validateCompleted(r.parameters,r,r.plan,r.equipmentProfile);
test('real PackingSolver certificate is converted to a new independently replayed PSS plan',()=>{const r=convert(p,csv,{axis:'V'});assert.equal(check(r).metrics.parts,26);assert.equal(r.externalEngine.name,'PackingSolver');assert.equal(r.verification.realMachineFeasibility,'unknown');assert.equal(r.metrics.heldRemainderTurns,0);assert.equal(r.metrics.originalSheetTurns,0);assert(r.plan.operations.some(o=>o.type==='endRip'));});
test('bad external certificates are rejected before admission',()=>{
 for(const bad of [csv.replace('PLATE_ID','BROKEN'),csv+'\n'+csv.split('\n')[1],csv.split('\n').filter((line,i)=>i!==csv.split('\n').findIndex((l,j)=>j>0&&Number(l.split(',')[7])>=0&&Number(l.split(',')[8])>0)).join('\n'),csv.replace(/,0,0,2750,1830,/,',0,0,2749,1830,')])assert.throws(()=>convert(p,bad,{axis:'V'}));
 assert.throws(()=>convert({...p,pieces:p.pieces.map((a,i)=>i? a:{...a,q:a.q+1})},csv,{axis:'V'}),/quantities/);
 assert.throws(()=>convert({...p,pieces:p.pieces.map(a=>({...a,l:a.l+1}))},csv,{axis:'V'}),/size/);
});
test('decimal dimensions are scaled exactly without rounding or changing grain',()=>{
 const q={sheetW:200,sheetH:150,kerf:5,trim:10,pieces:[{id:1,l:100.5,w:80.25,q:1,grain:true}]},data=scaled(q);assert.equal(data.scale,100);assert.equal(data.parameters.pieces[0].l,10050);
 const cert='PLATE_ID,COPIES,NODE_ID,X,Y,WIDTH,HEIGHT,TYPE,CUT,PARENT\n0,1,0,0,0,20000,15000,0,0,\n0,1,1,1000,1000,10050,8025,0,1,0\n';assert.equal(check(convert(q,cert,{axis:'H',scale:100})).metrics.parts,1);
 assert.throws(()=>convert(q,cert.replace('10050,8025','8025,10050'),{axis:'H',scale:100}),/grain/);
 assert.throws(()=>scaled({...q,kerf:5.00001}),/without rounding/);
});
test('missing native process fails explicitly; caller retains its own incumbent',()=>assert.throws(()=>runPacking(p,{python:'/no-such-listpro-python',seconds:1}),/ENOENT/));
test('a failing installed external engine cannot discard the complete server checkpoint',async()=>{
 if(process.platform==='win32')return;const {Worker}=require('node:worker_threads'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-native-fallback-'));
 const w=new Worker(path.join(__dirname,'../server/worker.cjs'),{workerData:{input:p,memoryPath:path.join(dir,'bank.json'),searchBudgetMs:10000},env:{...process.env,LISTPRO_PACKING_PYTHON:'/usr/bin/false'}});
 try{const r=await new Promise((resolve,reject)=>{w.on('error',reject);w.on('message',m=>{if(m.type==='error')reject(Error(m.message));if(m.type==='result')resolve(JSON.parse(m.json));});});assert.equal(check(r).metrics.parts,26);assert(r.search.nativeTrials.length>0);assert(r.search.nativeTrials.every(t=>t.status==='rejected-or-unavailable'));assert.equal(r.experienceInfo.saved,true);}
 finally{await w.terminate();fs.rmSync(dir,{recursive:true,force:true});}
});
