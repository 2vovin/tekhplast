'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads'),path=require('node:path');
const {present,blocksShortcut}=require('../policy.cjs'),{build}=require('../scripts/prepare.cjs');
test('demo response exposes exactly two complete sheets and no hidden identifiers, dimensions or operations',()=>{
 const raw={partCount:3,parameters:{sheetW:1200,sheetH:900,pieces:[]},metrics:{sheets:3,cuts:12},sheets:[0,1,2].map(i=>({parts:[{id:98765,instance:i+1,x:10.123,y:20.123,w:777.777,h:555.555}],remnants:[{w:123}]})),plan:{operations:[{secret:'full-production-cuts'}]},verification:{roleFrames:[{secret:'full-blanks'}]}};
 const r=present(raw,{material:'Стекло',thickness:4});assert.equal(r.sheets[0].parts[0].id,98765);assert.equal(r.sheets[1].parts.length,1);
 const locked=JSON.stringify(r.sheets[2]);for(const v of ['98765','777.777','555.555','10.123','instance'])assert(!locked.includes(v));assert.equal(r.sheets[2].locked,true);assert.deepEqual(r.sheets[2].parts,[]);
 assert(!JSON.stringify(r).includes('full-production-cuts'));assert(!JSON.stringify(r).includes('full-blanks'));assert.equal(raw.sheets[2].parts.length,1);
});
test('demo UI contains no presets, bundled optimizer, Worker source, print/export paths or stale added dimensions',()=>{
 const {html,app}=build();assert(!html.includes('data-example='));assert(!html.includes('factories='));assert(!app.includes('new Worker('));assert(!html.includes('900;700;3'));
 assert(app.includes("pieces:[]"));assert(app.includes("l:'',w:''"));assert(app.includes('window.listproDemo.calculate'));assert(html.includes('materialThickness'));
 assert(app.includes("function download(){toast('Экспорт недоступен"));assert(!app.includes('window.print();'));new (require('node:vm').Script)(app);
});
test('native print, save, source and devtools shortcuts blocked',()=>{
 for(const key of ['p','P','s','u'])assert(blocksShortcut({key,control:true}));assert(blocksShortcut({key:'F12'}));assert(blocksShortcut({key:'I',control:true,shift:true}));assert(!blocksShortcut({key:'a',control:true}));
});
test('actual demo worker solves a new three-sheet glass order without embedded examples',async()=>{
 const result=await new Promise((resolve,reject)=>{const w=new Worker(path.resolve(__dirname,'../worker.cjs'),{workerData:{coreBase:path.resolve(__dirname,'../..'),input:{sheetW:1200,sheetH:900,kerf:5,trim:10,thickness:4,material:'Стекло',objective:'cuts',partOrder:'descending',pieces:[{id:1,l:900,w:700,q:3,grain:false}]}}});w.on('error',reject);w.on('message',m=>{if(m.type==='progress')return;w.terminate();m.type==='error'?reject(Error(m.message)):resolve(m.result);});});
 assert.equal(result.metrics.sheets,3);assert.equal(result.material,'Стекло');assert.equal(result.thickness,4);assert.equal(result.sheets[2].locked,true);assert.equal(result.sheets[0].parts[0].w,900);
});
