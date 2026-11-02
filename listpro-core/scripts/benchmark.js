'use strict';
const fs=require('node:fs');
const {pack}=require('../src/core');
const filename=process.argv[2]||'benchmarks/manual-26-no-rotation.json';
const p=JSON.parse(fs.readFileSync(filename,'utf8'));
const t=performance.now(),r=pack(p);
console.log(JSON.stringify({filename,sheets:r.sheets.length,parts:r.partCount,
  elapsedMs:+(performance.now()-t).toFixed(2),status:'baseline only (not validated)'},null,2));
