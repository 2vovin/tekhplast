'use strict';
const fs=require('fs'),engine=require('../web/engine.cjs');
const [orderFile,bankFile,out,iter='10']=process.argv.slice(2);if(!out||fs.existsSync(out))throw Error('Usage: node scripts/search-with-reference-experience.js order.json bank.json new-result.json [iterations]');
const p=JSON.parse(fs.readFileSync(orderFile)),bank=JSON.parse(fs.readFileSync(bankFile)),started=Date.now();
const r=engine.arrange(engine.solve(p,{experience:bank,iterations:Number(iter),seed:42,objective:'remnants',progress:d=>process.stderr.write(d.text+'\n')}),'descending');
fs.writeFileSync(out,JSON.stringify(r));console.log(JSON.stringify({elapsedMs:Date.now()-started,metrics:r.metrics,experienceInfo:r.experienceInfo}));
