'use strict';
const VISIBLE_SHEETS=2;
function present(result,metadata={}){
 const p=result.parameters,W=p.sheetW,H=p.sheetH;
 return {
  experienceInfo:result.experienceInfo,sheetEstimate:result.sheetEstimate,partCount:result.partCount,usagePercent:100*result.sheets.flatMap(s=>s.parts).reduce((n,a)=>n+a.w*a.h,0)/(W*H*result.sheets.length),parameters:JSON.parse(JSON.stringify(p)),metrics:{...result.metrics},ordering:result.ordering,
  material:String(metadata.material||'Листовой материал'),thickness:Number(metadata.thickness),demo:true,
  sheets:result.sheets.map((s,i)=>i<VISIBLE_SHEETS?{locked:false,parts:s.parts,partCount:s.parts.length,remnants:s.remnants}:{
   locked:true,parts:[],partCount:s.parts.length,remnants:[],
   preview:s.parts.map(a=>({x:Math.round(a.x/W*200)*5,y:Math.round(a.y/H*200)*5,w:Math.max(5,Math.round(a.w/W*200)*5),h:Math.max(5,Math.round(a.h/H*200)*5)}))
  }),
  // No production operations, blank trees or per-sheet hidden part assignments reach the renderer.
  plan:{operations:result.sheets.map((_,i)=>({type:'load',sheet:i,step:i+1}))},verification:{roleFrames:[]}
 };
}
function blocksShortcut(input){return (input.control||input.meta)&&['p','s','u'].includes(String(input.key).toLowerCase())||input.key==='F12'||(input.control||input.meta)&&input.shift&&['i','j','c'].includes(String(input.key).toLowerCase());}
module.exports={present,blocksShortcut,VISIBLE_SHEETS};
