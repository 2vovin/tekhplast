'use strict';
const base=require('../web/engine.cjs'),{searchCompleted}=require('../src/completed-rip-search'),learning=require('../src/completed-rip-experience'),{fromTree}=require('../src/deferred-strip-patterns'),{compileCompleted}=require('../src/completed-rip');
function solve(input,options={}){
 const p=base.clean(input),run=(q,o)=>{
  if(q.pieces.length===1){const r=base.solve(q,{...o,experience:undefined,onBest:()=>{}});return compileCompleted(q,r.sheets.map(s=>fromTree(s.tree,q.kerf)));}
  return searchCompleted(base.clean(q),o);
 };
 return options.experience?learning.solveWithExperience(p,options.experience,(q,extra)=>run(q,{...options,...extra}),options):run(p,options);
}
module.exports={...base,solve};
