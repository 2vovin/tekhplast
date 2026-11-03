'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {techProfile}=require('../src/bazis-10-tech-profile');
const {analyzeAncestryTurns,validateAncestryTurns}=require('../src/ancestry-validator');
const {optimizeTechnology}=require('../src/brain21-search');
const {sortStrips}=require('../src/strip-ordering');
const {schedulePlan}=require('../src/stop-scheduler');
const {makeExamPlan}=require('../src/exam-plan');
const {exportTechnology}=require('../src/brain21-artifacts');
const p=require('../benchmarks/bazis-26-corrected.json');
const names=['balanced','fewest-cuts','low-turns','best-remnant'];
const initial=names.map(n=>require('../benchmarks/brain2/'+n+'/result.json'));
const dir=process.env.BRAIN21_OUTPUT||path.join(os.tmpdir(),'listpro-brain21');
function save(file,content){const target=path.join(dir,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',content);fs.renameSync(target+'.tmp',target);}
const report={host:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,cpuCount:os.cpus().length,totalMemory:os.totalmem()},audits:[],profiles:[],sorting:[],additional:[]};
for(let i=0;i<names.length;i++)for(const limit of [4,null]){
 const r=analyzeAncestryTurns(p,initial[i],initial[i].plan,techProfile(limit));
 report.audits.push({name:names[i],limit,valid:r.technologyProfileValid,metrics:r.metrics,parts:r.parts});
}
for(const limit of [4,null]){
 const key=limit??'unlimited',profile=techProfile(limit);
 const result=optimizeTechnology(p,profile,{seed:2026,iterations:20000,initialLayouts:initial,onBest:s=>save(key+'/best.json',JSON.stringify(s))});
 const saved=require('../benchmarks/brain21/'+key+'/result.json');
 assert.deepEqual(result.best.plan,saved.plan);assert.deepEqual(result.best.sheets,saved.sheets);
 validateAncestryTurns(p,result.best,result.best.plan,profile);
 for(const [file,content] of Object.entries(exportTechnology(result.best)))save(key+'/'+file,content);
 report.profiles.push({limit,metrics:result.best.metrics,search:result.search,alternatives:result.pareto.map(s=>({metrics:s.metrics,provenance:s.provenance}))});
}
// Isolate order effects on the unchanged 44/13 map, independently replay all.
for(const sorting of ['original','size-desc','size-asc','utilization','narrow-centre']){
 const layout=sortStrips(initial[2],p.kerf,sorting),plan=makeExamPlan(p,layout,techProfile().baseProfile);
 for(const strategy of ['original','size-desc','size-asc','utilization','settings']){
  const s=schedulePlan(plan,layout,{strategy}),v=validateAncestryTurns(p,layout,s.plan,techProfile());
  report.sorting.push({sorting,strategy,metrics:v.metrics,scheduler:s.search});
 }
}
for(const c of require('../src/recursive-strip-cases').cases().filter(c=>['varied-50','varied-100','varied-200'].includes(c.name)))for(const limit of [4,null]){
 const result=optimizeTechnology(c.parameters,techProfile(limit),{iterations:50,seed:2026,postprocessLimit:3});
 validateAncestryTurns(c.parameters,result.best,result.best.plan,result.best.technologyProfile);
 report.additional.push({name:c.name,limit,metrics:result.best.metrics,search:result.search});
}
save('benchmark.json',JSON.stringify(report,null,2));console.log('BRAIN21_REPORT '+JSON.stringify(report));
