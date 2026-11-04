'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{Worker}=require('node:worker_threads');
const {clean,verify,solve,equalOrder}=require('../web/engine.cjs'),{build}=require('../web/build.cjs'),{bundle}=require('../web/bundle.cjs');
const examples=require('../web/examples.json'),clone=o=>JSON.parse(JSON.stringify(o));
const built=build();
test('web: byte-for-byte reproducible single-file site and parsable browser scripts',()=>{
 assert.equal(built.html,fs.readFileSync(path.join(__dirname,'../web/index.html'),'utf8'));
 new vm.Script(built.worker);new vm.Script(fs.readFileSync(path.join(__dirname,'../web/app.js'),'utf8'));
 assert(!built.html.includes('__WORKER__'));assert(!built.html.includes('src="https://'));
 assert(!built.modules.includes('src/order-held-artifacts.js'));
});
test('web: all three presets are independently replayed, including held remainders',()=>{
 for(const [key,sheets,cuts,turns]of [['26',1,43,12],['44',2,60,7],['171',10,328,106]]){
  const e=examples[key],r=verify(clean(e.parameters),e.layout);
  assert.equal(r.partCount,Number(key));assert.equal(r.metrics.sheets,sheets);assert.equal(r.metrics.cuts,cuts);assert.equal(r.metrics.turns,turns);
  assert.equal(r.metrics.heldRemainderTurns,0);assert.equal(r.verification.targetPSSModelValid,true);assert.equal(r.verification.realMachineFeasibility,'unknown');
 }
});
test('web: actual calculation preserves the two 44-part objectives',()=>{
 const r=solve(examples['44'].parameters,{objective:'remnants'}),c=solve(examples['44'].parameters,{objective:'cuts'});
 assert.deepEqual(r.sheets.map(s=>s.parts.length),[28,16]);assert.equal(r.metrics.cuts,60);assert.equal(r.metrics.largestWaste,2730*800);
 assert.deepEqual(c.sheets.map(s=>s.parts.length),[24,20]);assert.equal(c.metrics.cuts,58);assert.equal(c.metrics.turns,6);
});
test('web: edited fractional order is recomputed; a preset cannot override quantities',()=>{
 const input={sheetW:1200,sheetH:800,kerf:5,trim:10,pieces:[{l:278.5,w:228,q:3,grain:false},{l:468,w:59,q:2,grain:true}]};
 const r=solve(input,{iterations:3,examples:Object.values(examples)});assert.equal(r.partCount,5);assert.equal(r.verification.targetPSSModelValid,true);
 for(const a of r.sheets.flatMap(s=>s.parts)){const p=input.pieces[a.id-1];assert.deepEqual([a.w,a.h],a.rotated?[p.w,p.l]:[p.l,p.w]);if(p.grain)assert(!a.rotated);}
 const p=clone(examples['44'].parameters);p.pieces[0].q=43;assert(!equalOrder(p,examples['44'].parameters));assert.equal(solve(p,{iterations:1}).partCount,43);
});
test('web: quantity limits are checked before allocation and invalid settings are rejected',()=>{
 const p=clone(examples['44'].parameters);p.pieces[0].q=1e12;assert.throws(()=>clean(p),/2500/);
 p.pieces[0].q=1.5;assert.throws(()=>clean(p));p.pieces[0].q=1;p.trim=2;assert.throws(()=>clean(p));
 p.trim=10;p.pieces[0].l='573,5';assert.equal(clean(p).pieces[0].l,573.5);
 assert.throws(()=>solve(p,{objective:'unknown'}));assert.throws(()=>solve(p,{iterations:1000}));
});
test('web: damaged preset cannot be displayed as verified',()=>{
 const e=examples['44'],s=clone(e.layout);let n=s.sheets[0].tree;while(n.kind==='cut')n=n.first;n.rect.w+=1;
 assert.throws(()=>verify(clean(e.parameters),s));
});
test('web: the bundled Web Worker executes the same calculation and reports input errors',async()=>{
 const prelude="const {parentPort}=require('node:worker_threads');global.self={postMessage:m=>parentPort.postMessage(m)};parentPort.on('message',data=>self.onmessage({data}));\n";
 async function run(message){const w=new Worker(prelude+built.worker,{eval:true});try{return await new Promise((resolve,reject)=>{w.on('error',reject);w.on('message',m=>{if(m.type!=='progress')resolve(m);});w.postMessage(message);});}finally{await w.terminate();}}
 const r=await run({action:'solve',input:examples['44'].parameters,options:{objective:'remnants'}});
 assert.equal(r.type,'result');assert.equal(r.result.metrics.cuts,60);assert.deepEqual(r.result.sheets.map(s=>s.parts.length),[28,16]);
 const sorted=await run({action:'validate',input:examples['26'].parameters,layout:examples['26'].layout,partOrder:'descending'});
 assert.equal(sorted.result.sheets[0].parts[0].id,5);assert.equal(sorted.result.metrics.cuts,43);
 const original=await run({action:'validate',input:examples['26'].parameters,layout:examples['26'].layout,partOrder:'optimized'});
 assert.equal(original.result.sheets[0].parts[0].id,3);
 const bad=await run({action:'solve',input:{pieces:[]}});assert.equal(bad.type,'error');
});
test('web: script-tag injection in imported strings stays data',()=>{
 const fake={
 'web/engine.cjs':'module.exports={};','web/styles.css':'','web/app.js':'','desktop/table-import.js':'',
 'web/examples.json':JSON.stringify({name:'</script><img src=x onerror=alert(1)>'}),
 'web/template.html':'<script type="application/json">__EXAMPLES__</script><script type="text/plain">__WORKER__</script>'
 };
 const html=bundle(fake).html;assert(!html.includes('<img'));assert(html.includes('\\u003c/script>'));
});
