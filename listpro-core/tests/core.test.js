'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pack}=require('../src/core');
test('a fitting rectangle produces one part on one sheet',()=>{
 const x=pack({sheetW:900,sheetH:600,kerf:5,trim:10,
  pieces:[{id:1,l:500,w:300,q:1,grain:true}]});
 assert.equal(x.sheets.length,1);assert.equal(x.sheets[0].parts.length,1);
 assert.equal(x.sheets[0].parts[0].rotated,false);
});
test('grain constrained part cannot be rotated',()=>{
 assert.throws(()=>pack({sheetW:600,sheetH:900,kerf:5,trim:0,
  pieces:[{id:1,l:700,w:200,q:1,grain:true}]}),/does not fit/);
});
test('non-grain part can rotate when required',()=>{
 const x=pack({sheetW:600,sheetH:900,kerf:5,trim:0,
  pieces:[{id:1,l:700,w:200,q:1,grain:false}]});
 assert.equal(x.sheets[0].parts[0].rotated,true);
});
test('benchmark fixture has exactly 26 physical parts, all rotation forbidden',()=>{
 const x=JSON.parse(fs.readFileSync('benchmarks/manual-26-no-rotation.json','utf8'));
 assert.equal(x.pieces.reduce((a,p)=>a+p.q,0),26);
 assert(x.pieces.every(p=>p.grain===true));
});
