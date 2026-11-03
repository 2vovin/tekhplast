'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {searchRecursive}=require('../src/recursive-strip'),{validateRecursive}=require('../src/recursive-strip-validator');
const {cases}=require('../src/recursive-strip-cases'),{artifacts}=require('../src/recursive-strip-artifacts');
const profile=require('../profiles/abstract-staged-detached-strips-exam-v1.json');
const outputDir=process.env.BRAIN2_OUTPUT||path.join(os.tmpdir(),'listpro-brain2-results');
fs.mkdirSync(outputDir,{recursive:true});
function save(name,data){const target=path.join(outputDir,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',data);fs.renameSync(target+'.tmp',target);}
const dataset=cases(),records=[];
for(let i=0;i<dataset.length;i++){
 const c=dataset[i],iterations=i===0?20000:100;
 const r=searchRecursive(c.parameters,profile,{seed:2026,iterations,onBest:s=>save(c.name+'/best.json',JSON.stringify(s))});
 validateRecursive(c.parameters,r.best,r.best.plan,profile);
 const row={name:c.name,iterations,metrics:r.best.metrics,search:r.search,partArea:c.parameters.pieces.reduce((a,j)=>a+j.l*j.w*j.q,0),
  primaryWidths:r.best.sheets.map(s=>s.primaryStrips.slice(0,-1).map(a=>a.rect.w)),
  largestRemnants:r.best.verification.usableRemnants.slice().sort((a,b)=>b.area-a.area).slice(0,3)};
 // Previous expanded PSS optimizer, same job and seed, bounded comparison.
 const start=Date.now();
 try{const old=require('../src/exam-search').searchExam(c.parameters,profile,{seed:2026,iterations:i===0?20000:100});
  row.previousPSS={metrics:old.verification.metrics,elapsedMs:Date.now()-start,iterations:i===0?20000:100};}
 catch(e){row.previousPSS={error:e.message,elapsedMs:Date.now()-start};}
 if(i===0){
  assert.equal(r.best.sheets.length,1);
  const low=r.pareto.slice().sort((a,b)=>a.metrics.cuts-b.metrics.cuts||a.metrics.turns-b.metrics.turns||a.metrics.cutLength-b.metrics.cutLength)[0];
  assert.deepEqual(low.plan,require('../benchmarks/brain2/fewest-cuts/result.json').plan);
  row.pareto=r.pareto.map(a=>({metrics:a.metrics,configuration:a.configuration}));
  for(const [name,data] of Object.entries(artifacts(low)))save('fewest-cuts/'+name,data);
 }
 records.push(row);console.log('BRAIN2_CASE '+JSON.stringify(row));
}
const report={host:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,cpuCount:os.cpus().length,totalMemory:os.totalmem()},records};
save('benchmark.json',JSON.stringify(report,null,2));console.log('BRAIN2_REPORT '+JSON.stringify(report));
if(process.env.CI==='true'||process.env.BRAIN2_EXTERNAL==='1'){
 const external=require('../src/packingsolver-benchmark').runExternal(dataset);
 save('packingsolver.json',JSON.stringify(external,null,2));console.log('BRAIN2_PACKINGSOLVER '+JSON.stringify(external));
 if(external.records.some(r=>r.error))throw Error('External benchmark failed; see explicit per-case errors');
}else console.log('PackingSolver not run: set BRAIN2_EXTERNAL=1 (automatic in CI).');
