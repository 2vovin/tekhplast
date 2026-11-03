'use strict';
const corrected=require('../benchmarks/bazis-26-corrected.json');
function cases(){
 let state=20026;const rnd=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 function order(name,count,kind){
  const pieces=[];
  for(let i=0;i<count;i++){
   let l=80+Math.floor(rnd()*640),w=60+Math.floor(rnd()*380),grain=true;
   if(kind==='narrow'){l=900+Math.floor(rnd()*500);w=40+Math.floor(rnd()*100);}
   if(kind==='square'){l=100+50*Math.floor(rnd()*6);w=l;}
   if(kind==='small'){l=120;w=90;}
   if(kind==='rotation')grain=false;
   if(kind==='mixed')grain=i%3!==0;
   pieces.push({id:i+1,l,w,q:1,grain});
  }
  return {name,parameters:{sheetW:2750,sheetH:1830,trim:10,kerf:5,pieces}};
 }
 return [{name:'corrected-26',parameters:corrected},
  {name:'corrected-doubled-52',parameters:{...corrected,pieces:corrected.pieces.map(p=>({...p,q:p.q*2}))}},
  order('varied-30',30),order('varied-50',50),order('varied-100',100),order('varied-200',200),
  order('narrow-60',60,'narrow'),order('square-80',80,'square'),order('small-200',200,'small'),
  order('rotation-50',50,'rotation'),order('mixed-65',65,'mixed')];
}
module.exports={cases};