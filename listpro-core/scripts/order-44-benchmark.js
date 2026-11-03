'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {solveIdenticalTwoSheets}=require('../src/identical-strip-patterns');
const {artifacts}=require('../src/order-held-artifacts');
const p=require('../benchmarks/order-44-500x300/input.json'),saved=require('../benchmarks/order-44-500x300/result.json');
const r=solveIdenticalTwoSheets(p,saved.equipmentProfile);
assert.deepEqual(r.remnantBest.verification.metrics,saved.verification.metrics);
if(process.argv.includes('--write')){
 const files=artifacts(r.remnantBest);
 files['alternative-64-cuts.json']=JSON.stringify(r.cutsBest)+'\n';
 for(let i=0;i<r.cutsBest.sheets.length;i++)files['alternative-sheet-'+(i+1)+'.svg']=artifacts(r.cutsBest)['sheet-'+(i+1)+'.svg'];
 for(const [name,content]of Object.entries(files)){
  const dest=path.join(__dirname,'../benchmarks/order-44-500x300',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
 }
}
console.log('ORDER_44_REPORT '+JSON.stringify({search:r.stats,main:r.remnantBest.verification.metrics,alternative:r.cutsBest.verification.metrics}));
