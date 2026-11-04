'use strict';
// Bounded practice on generated puzzles. No customer orders are built in.
const fs=require('node:fs'),engine=require('../web/engine.cjs'),m=require('../src/cutting-experience'),store=require('../desktop-demo/experience-store.cjs');
const args=process.argv.slice(2),file=args[0];function option(flag,fallback){const i=args.indexOf(flag);return i<0?fallback:Number(args[i+1]);}
const orders=option('--orders',5),seed=option('--seed',42);if(!file||!Number.isInteger(orders)||orders<1||orders>100||!Number.isSafeInteger(seed))throw Error('Usage: node scripts/self-train-experience.js <database.json> --orders 1..100 --seed 42');
let state=seed>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<orders;i++){
 const p={sheetW:2750,sheetH:1830,trim:10,kerf:5,pieces:Array.from({length:6+Math.floor(random()*6)},(_,j)=>({id:j+1,l:150+Math.floor(random()*2050),w:80+Math.floor(random()*950),q:1+Math.floor(random()*3),grain:random()<.2}))};
 const start=Date.now(),bank=m.normalize(store.read(file)),r=engine.solve(p,{experience:bank,forceSearch:true,iterations:100,seed:(seed+i*97)>>>0});
 const next=store.update(file,fresh=>m.remember(fresh,r.parameters,r));console.log(JSON.stringify({puzzle:i+1,seed:seed+i*97,parts:r.partCount,sheets:r.metrics.sheets,cuts:r.metrics.cuts,patterns:next.patterns.length,books:next.books.length,solves:next.solves,elapsedMs:Date.now()-start}));
}
