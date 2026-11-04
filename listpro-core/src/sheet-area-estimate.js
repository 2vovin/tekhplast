'use strict';
function estimateSheets(p,foundSheets=null){
 const usableArea=(p.sheetW-2*p.trim)*(p.sheetH-2*p.trim),partArea=p.pieces.reduce((s,a)=>s+a.l*a.w*a.q,0);
 if(!(usableArea>0)||!Number.isFinite(partArea))throw Error('Invalid area input');
 const minimumSheets=Math.ceil(partArea/usableArea-1e-12);
 return {partArea,usableArea,minimumSheets,foundSheets,gap:foundSheets===null?null:foundSheets-minimumSheets,target:foundSheets>minimumSheets?foundSheets-1:null,basis:'area-only; kerf, orientation and staged feasibility still require replay'};
}
module.exports={estimateSheets};
