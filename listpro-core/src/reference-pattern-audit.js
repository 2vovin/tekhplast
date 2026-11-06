'use strict';
// PDF topology is only a proposal. Real dimensions and unchanged PSS replay decide admission.
const {auditReference}=require('./manual-reference-audit');
const {fromDiagram,buildRawLayout}=require('./deferred-strip-patterns');
const {verifyDeferred}=require('./deferred-strip-search');
function validatePlacements(p,sheets){
 const expected=new Map(p.pieces.map(a=>[a.id,a])),counts=new Map(),eps=1e-7;
 for(const sh of sheets){for(const a of sh.parts){const e=expected.get(a.id);if(!e)throw Error('Unknown part');
  if(a.rotated&&e.grain!==false)throw Error('Grain rotation');
  if(a.w!==(a.rotated?e.w:e.l)||a.h!==(a.rotated?e.l:e.w))throw Error('Changed dimensions');
  if(![a.x,a.y,a.w,a.h].every(Number.isFinite)||a.x<p.trim-eps||a.y<p.trim-eps||a.x+a.w>p.sheetW-p.trim+eps||a.y+a.h>p.sheetH-p.trim+eps)throw Error('Part outside usable sheet');
  counts.set(a.id,(counts.get(a.id)||0)+1);
 }
 for(let i=0;i<sh.parts.length;i++)for(let j=i+1;j<sh.parts.length;j++){const a=sh.parts[i],b=sh.parts[j];if(!(a.x+a.w+p.kerf<=b.x+eps||b.x+b.w+p.kerf<=a.x+eps||a.y+a.h+p.kerf<=b.y+eps||b.y+b.h+p.kerf<=a.y+eps))throw Error('Overlap or missing kerf');}
 }
 for(const a of p.pieces)if(counts.get(a.id)!==a.q)throw Error('Quantity mismatch');
 return {valid:true,parts:[...counts.values()].reduce((a,b)=>a+b,0)};
}
function auditPatterns(p,reference){
 const inventory=auditReference(p,reference),sheets=[],admitted=[];
 const settingsMatch=reference.sheets.every(s=>s.printedKerf===p.kerf&&s.printedTrim.every(t=>t===p.trim)&&s.printedTrim.length===4&&s.printedSize[0]===p.sheetW-2*p.trim&&s.printedSize[1]===p.sheetH-2*p.trim&&Number.isSafeInteger(s.copies)&&s.copies>0);
 if(!inventory.inventoryMatches||!inventory.dimensionsMatch||!settingsMatch)throw Error('Source order or settings mismatch; admission denied');
 for(const source of reference.sheets){
  const pattern=fromDiagram(p,source.topology),parts=[];
  function place(n,x,y){if(n.part){parts.push({id:n.part.id,rotated:n.part.rotated,x,y,w:n.w,h:n.h});return;}let at=0;for(const c of n.children){place(c,x+(n.axis==='V'?at:0),y+(n.axis==='H'?at:0));at+=(n.axis==='V'?c.w:c.h)+p.kerf;}}
  place(pattern,p.trim,p.trim);
  const sub={...p,pieces:source.inventory.map(a=>({...p.pieces.find(b=>b.id===a.id),q:a.q}))};
  let status;try{const r=verifyDeferred(sub,buildRawLayout(sub,[pattern]));admitted.push({sourceSheet:source.sheet,result:r});status={targetPSSModelValid:true,metrics:r.metrics};}catch(e){status={targetPSSModelValid:false,reason:e.message};}
  const primarySpan=pattern.axis==='V'?pattern.w:pattern.h;
  const rawSpan=pattern.axis==='V'?p.sheetW:p.sheetH;
  const terminalTail=rawSpan-p.trim-primarySpan-p.kerf;
  for(let copy=0;copy<source.copies;copy++)sheets.push({sourceSheet:source.sheet,copy:copy+1,firstAxis:pattern.axis,pattern,parts,terminalPrimaryTail:terminalTail,...status});
 }
 const geometry=validatePlacements(p,sheets);
 return {inventory,settingsMatch,reconstructedGeometry:geometry,sourceCoordinatesExact:false,sourceSequenceKnown:false,targetPSSModelValid:sheets.every(s=>s.targetPSSModelValid),realMachineFeasibility:'unknown',sheets,admitted};
}
module.exports={auditPatterns,validatePlacements};
