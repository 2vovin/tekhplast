'use strict';
const fs=require('node:fs'),path=require('node:path'),{searchCompleted}=require('../../src/completed-rip-search'),p=require('./input.json');
const r=searchCompleted(p,{iterations:100,seed:18569});
fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(r)+'\n');
console.log(JSON.stringify({metrics:r.metrics,search:r.search}));
