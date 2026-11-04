'use strict';
const fs=require('node:fs'),path=require('node:path'),{searchDeferredMargins}=require('../src/deferred-margin-search'),{estimateSheets}=require('../src/sheet-area-estimate');
const p=require('../benchmarks/order-171/input.json'),dir=path.resolve(__dirname,'../benchmarks/order-171-auto');let best=null;const start=Date.now();
const t=searchDeferredMargins(p,{iterations:100,seed:42,candidates:48,accept:r=>{if(!best||r.metrics.sheets<best.metrics.sheets||r.metrics.sheets===best.metrics.sheets&&r.metrics.cuts<best.metrics.cuts)best=r;}});
if(!best)throw Error('No accepted layout');fs.writeFileSync(path.join(dir,'best.json'),JSON.stringify(best));fs.writeFileSync(path.join(dir,'wide-search.json'),JSON.stringify({estimate:estimateSheets(p,best.metrics.sheets),metrics:best.metrics,stats:t.stats,elapsedMs:Date.now()-start},null,2));console.log(best.metrics);
