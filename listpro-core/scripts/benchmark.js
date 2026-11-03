'use strict';
const {pack}=require('../src/core');
const {validate}=require('../src/validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const s=pack(p,{seed:1,iterations:100000});
console.log(JSON.stringify({metrics:validate(p,s),search:s.search,optimality:s.optimality},null,2));
if(s.sheets.length!==1)throw Error('Control order regression');
