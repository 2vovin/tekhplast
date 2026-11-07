'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {compileCompleted}=require('../../../src/completed-rip');
const {validateCompleted}=require('../../../src/completed-rip-validator');
const original=require('../input.json');
const file=process.argv[2]||require('node:path').join(__dirname,'pool.json.gz');
const raw=fs.readFileSync(file),pool=JSON.parse(file.endsWith('.gz')?zlib.gunzipSync(raw):raw);
assert.deepEqual(pool.parameters,original);
let checked=0;
for(const entry of pool.patterns) {
 const counts=pool.groups.map(()=>0);
 function visit(n) {
  if(n.part){const g=pool.groups[n.part.id-1];assert.ok(g);assert.ok(n.w===g.l&&n.h===g.w||n.w===g.w&&n.h===g.l);counts[g.index]++;}
  else n.children.forEach(visit);
 }
 visit(entry.pattern);assert.deepEqual(counts,entry.counts);
 const pieces=pool.groups.filter(g=>counts[g.index]).map(g=>{assert.ok(counts[g.index]<=g.q);return{id:g.index+1,l:g.l,w:g.w,q:counts[g.index],grain:false};});
 const p={...original,pieces},r=compileCompleted(p,[entry.pattern]);
 const report=validateCompleted(p,r,r.plan,r.equipmentProfile);
 assert.equal(report.geometryValid,true);assert.equal(report.targetPSSModelValid,true);assert.equal(report.metrics.sheets,1);checked++;
}
console.log(JSON.stringify({checked,geometry:true,pss:true,realMachine:'unknown'}));
