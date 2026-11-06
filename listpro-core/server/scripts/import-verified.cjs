'use strict';
const fs=require('node:fs'),path=require('node:path'),learning=require('../../src/completed-rip-experience'),store=require('../../desktop-demo/experience-store.cjs');
const [source,destination='/var/lib/listpro/experience-completed-v1.json']=process.argv.slice(2);
if(!source||path.resolve(source)===path.resolve(destination))throw Error('Supply a verified result and a different experience database path');
if(fs.statSync(source).size>12*1024*1024)throw Error('Result exceeds size limit');
const result=JSON.parse(fs.readFileSync(source,'utf8'));
const next=store.update(destination,bank=>learning.remember(bank,result.parameters,result));
console.log(JSON.stringify({profile:next.profile,patterns:next.patterns.length,solves:next.solves,sheets:result.metrics.sheets}));
