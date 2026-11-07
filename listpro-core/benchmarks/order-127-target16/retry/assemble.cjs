'use strict';
// Rebuild selected sheet patterns against the ORIGINAL order, then replay PSS.
const {compileCompleted}=require('../../../src/completed-rip');
function assemble(pool,selection,{attempts=100}={}) {
 if(!Array.isArray(selection.selection)||!selection.selection.length)throw Error('No selected patterns');
 const total=pool.parameters.pieces.reduce((sum,p)=>sum+p.q,0);
 let rand=11,lastError;
 const rng=()=>((rand=(Math.imul(rand,1664525)+1013904223)>>>0)/4294967296);
 for(let attempt=0;attempt<attempts;attempt++) {
  const patterns=[];
  for(const {index,copies} of selection.selection) {
   if(!Number.isInteger(index)||!pool.patterns[index]||!Number.isInteger(copies)||copies<1||patterns.length+copies>total)throw Error('Invalid selection');
   for(let i=0;i<copies;i++)patterns.push(structuredClone(pool.patterns[index].pattern));
  }
  if(attempt)for(let i=patterns.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[patterns[i],patterns[j]]=[patterns[j],patterns[i]];}
  const remaining=pool.parameters.pieces.map(p=>({...p,left:p.q}));
  function bind(n) {
   if(n.part) {
    const a=remaining.find(a=>a.left&&((n.w===a.l&&n.h===a.w)||(a.grain===false&&n.w===a.w&&n.h===a.l)));
    if(!a)return null; // Excess copies become free space; compile new geometry.
    a.left--;return{part:{id:a.id,rotated:n.w!==a.l||n.h!==a.w},w:n.w,h:n.h};
   }
   const children=n.children.map(bind).filter(Boolean);
   return children.length===0?null:children.length===1?children[0]:{axis:n.axis,children};
  }
  try {
   const final=patterns.map(bind).filter(Boolean);
   if(remaining.some(a=>a.left))throw Error('Missing original quantities');
   return compileCompleted(pool.parameters,final);
  } catch(e) {lastError=e;}
 }
 throw lastError||Error('No valid assembly');
}
if(require.main===module) {
 const fs=require('node:fs');
 const result=assemble(JSON.parse(fs.readFileSync(process.argv[2])),JSON.parse(fs.readFileSync(process.argv[3])));
 fs.writeFileSync(process.argv[4],JSON.stringify(result));console.log(JSON.stringify(result.metrics));
}
module.exports={assemble};
