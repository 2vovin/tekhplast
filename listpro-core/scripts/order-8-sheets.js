'use strict';
const fs=require('node:fs'),path=require('node:path'),{searchDeferredMargins}=require('../src/deferred-margin-search'),{estimateSheets}=require('../src/sheet-area-estimate');
const dir=path.resolve(__dirname,'../benchmarks/order-8-sheets'),p=require(path.join(dir,'input.json'));let best=require(path.join(dir,'baseline.json'));const trials=[];
const started=Date.now();for(const seed of [42,2026,73]){const trial=searchDeferredMargins(p,{seed,iterations:100,accept:r=>{if(r.metrics.sheets<best.metrics.sheets||r.metrics.sheets===best.metrics.sheets&&r.metrics.cuts<best.metrics.cuts)best=r;}});trials.push(trial.stats);}
fs.writeFileSync(path.join(dir,'best.json'),JSON.stringify(best));fs.writeFileSync(path.join(dir,'search.json'),JSON.stringify({estimate:estimateSheets(p,best.metrics.sheets),metrics:best.metrics,trials,elapsedMs:Date.now()-started},null,2));console.log(best.metrics);
