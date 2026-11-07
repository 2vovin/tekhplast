'use strict';
const fs=require('node:fs'),{runPacking}=require('../src/packing-pss');
// General progressive search. No order IDs, customer dimensions or saved maps.
const schedule=()=>[
 ...[5,15,30].flatMap(seconds=>['H','V'].map(axis=>({axis,stages:2,seconds}))),
 ...[3,-1].flatMap(stages=>['H','V'].map(axis=>({axis,stages,seconds:5})))
];
function searchNative(p,{python,deadline,minimum,getBest,onCandidate,progress=()=>{},run=runPacking,now=Date.now}){
 const trials=[],available=fs.existsSync(python);
 if(!available)return{available,trials:[{status:'unavailable',reason:'PackingSolver is not installed'}]};
 for(const attempt of schedule()){
  if(getBest()?.metrics.sheets<=minimum)break;
  // Reserve time for validation/checkpointing; never start a long call near expiry.
  const seconds=Math.min(attempt.seconds,Math.floor((deadline-now()-5000)/1000));
  if(seconds<1)break;
  const {axis,stages}=attempt;
  progress({text:'Углублённый поиск · '+axis+' · '+(stages===-1?'рекурсивный':stages+' стадии')+' · до '+seconds+' с',percent:20});
  const started=now();
  try{
   const {result}=run(p,{python,seconds,axis,stages});
   // The caller independently admits a complete physical plan and keeps its best.
   onCandidate(result);trials.push({axis,stages,seconds,status:'PSS-validated',metrics:result.metrics,elapsedMs:now()-started});
  }catch(e){trials.push({axis,stages,seconds,status:'rejected-or-unavailable',reason:e.message.slice(-1500),elapsedMs:now()-started});}
 }
 return{available,trials};
}
module.exports={schedule,searchNative};
