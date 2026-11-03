console.log('Historical NON-PSS regressions follow; only the final PANEL_SAW_STAGED 1.2 replay validates current PSS roles and real anchors.');
'use strict';
const {pack}=require('../src/core');
const {validate}=require('../src/validator');
const {validateTechnology,assessTechnology}=require('../src/technology-validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const profile=require('../profiles/abstract-fixed-xy-v1.json');
const saved=require('../benchmarks/manual-26-technology.json');
const s=pack(p,{seed:1,iterations:100000,profile});
const result=validateTechnology(p,s,s.machinePlan,profile);
const savedResult=validateTechnology(p,saved.layout,saved.plan,profile);
const oneAxis={...profile,id:'abstract-fixed-v-only-v1',allowedCutAxes:['V']};
const rejected=assessTechnology(p,s,{...s.machinePlan,profileId:oneAxis.id},oneAxis);
console.log(JSON.stringify({geometry:validate(p,s),technology:result.technology,
 savedArtifact:savedResult.technology,singleAxis:rejected.technology,search:s.search,optimality:s.optimality},null,2));
if(s.sheets.length!==1||s.partCount!==26||!result.technology.valid||rejected.technology.valid)throw Error('Control regression');

// Keep fixed-coordinate regression and run the target staged panel saw as well.
require('./staged-benchmark');

// Brain 1.1 uses the same seed/start budget and independently replays the saved plan.
require('./industrial-benchmark');

require('./pss-benchmark');

require('./pss13-benchmark');

require('./pss14-benchmark');

require('./pss15-benchmark');

require('./bazis-corrected-benchmark');

// Independent Brain 2.0 experiment, keeps every historical benchmark.
require('./recursive-strip-benchmark');

// Brain 2.1 keeps all historical benchmarks and adds ancestry/stop models.
require('./brain21-benchmark');

// Parallel primary bands: corrected target-role regression and new 26-part map.
require('./parallel-bands-benchmark');

// Current user rule: retained remainders stay in place at EVERY strip level.
require('./held-strips-benchmark');

// 98 source rows / 171 freely rotatable parts, adaptive primary strips and sheet neighborhoods.
require('./order-171-benchmark');
