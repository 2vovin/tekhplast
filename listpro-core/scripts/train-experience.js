'use strict';
const fs=require('node:fs'),path=require('node:path'),engine=require('../web/engine.cjs'),learning=require('../src/cutting-experience'),store=require('../desktop-demo/experience-store.cjs');
const args=process.argv.slice(2),verified=args.includes('--verified-results');if(verified)args.splice(args.indexOf('--verified-results'),1);const roundArg=args.indexOf('--rounds');let rounds=1;
if(roundArg>=0){rounds=Number(args[roundArg+1]);args.splice(roundArg,2);}if(!Number.isInteger(rounds)||rounds<1||rounds>100||args.length<2)throw Error('Usage: node scripts/train-experience.js <database.json> <order.json> [other orders.json] [--rounds 1..100]');
const [file,...orders]=args;if(orders.some(order=>path.resolve(order)===path.resolve(file)))throw Error('Database and input orders must be different files');
for(let round=0;round<rounds;round++)for(const order of orders){const raw=JSON.parse(fs.readFileSync(order,'utf8')),p=raw.project||raw.parameters||raw,bank=learning.normalize(store.read(file)),started=Date.now();
 const result=verified?raw:engine.solve(p,{experience:bank,seed:42+round*97,iterations:100,forceSearch:true,objective:p.objective||'remnants'});
 const next=store.update(file,fresh=>learning.remember(fresh,result.parameters,result));console.log(JSON.stringify({order:path.basename(order),round:round+1,sheets:result.metrics.sheets,cuts:result.metrics.cuts,turns:result.metrics.turns,patterns:next.patterns.length,recipes:next.recipes.length,solves:next.solves,elapsedMs:Date.now()-started}));
}
