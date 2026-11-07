'use strict';
// Reproducible benchmark call; production code has no built-in customer layouts.
const fs=require('node:fs'),path=require('node:path'),p=require('./input.json'),{runPacking}=require('../../src/packing-pss');
const out=path.resolve(process.argv[2]||'/tmp/listpro-order187'),python=process.argv[3]||process.env.LISTPRO_PACKING_PYTHON||'/opt/listpro/packing/bin/python';fs.mkdirSync(out,{recursive:true});
const c=runPacking(p,{python,seconds:30,axis:'H',stages:2});
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(c.result));fs.writeFileSync(path.join(out,'certificate.csv'),c.certificate);fs.writeFileSync(path.join(out,'native-summary.json'),JSON.stringify(c.summary,null,2));
require('../../src/completed-rip-validator').validateCompleted(p,c.result,c.result.plan,c.result.equipmentProfile);
console.log(JSON.stringify({metrics:c.result.metrics,engine:c.result.externalEngine,all187On16:c.result.metrics.sheets<=16},null,2));
// Timed search may differ across machines; the saved result is replayed without
// invoking the native solver by verify.cjs, and remains the accepted incumbent.
