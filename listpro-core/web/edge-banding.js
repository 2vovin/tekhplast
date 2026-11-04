'use strict';
(function(root){
 const sides=['top','right','bottom','left'];
 const labels={top:'Верх',right:'Право',bottom:'Низ',left:'Лево'};
 const thicknesses=[0,.4,.8,1,2];
 function normalize(value){return Object.fromEntries(sides.map(side=>[side,thicknesses.includes(Number(value?.[side]))?Number(value[side]):0]));}
 // A placed part's rotated flag means 90 degrees clockwise for edge annotations.
 // Physical blank rotations add to this; cut dimensions remain unchanged.
 function segments(rect,value,turns=0){
  const edges=normalize(value),q=((turns%4)+4)%4;
  const {x,y,w,h}=rect,inset=Math.min(8,w/6,h/6),x0=x+inset,y0=y+inset,x1=x+w-inset,y1=y+h-inset;
  const lines=[[x0,y0,x1,y0],[x1,y0,x1,y1],[x0,y1,x1,y1],[x0,y0,x0,y1]];
  return sides.flatMap((source,i)=>edges[source]?[{source,side:sides[(i+q)%4],thickness:edges[source],points:lines[(i+q)%4]}]:[]);
 }
 function describe(value){const e=normalize(value);return sides.filter(s=>e[s]).map(s=>labels[s]+' '+String(e[s]).replace('.',',')).join(' · ');}
 const api={sides,labels,thicknesses,normalize,segments,describe};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.ListProEdges=api;
})(globalThis);
