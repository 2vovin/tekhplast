'use strict';
// Inventory and diagram-topology audit. This deliberately does NOT certify a
// manufacturing plan from approximate PDF drawing coordinates.
function auditReference(order,reference){
 const totals=new Map(),drawn=new Map(),errors=[],printDifferences=new Map(),profiles=[];
 const expected=new Map(order.pieces.map(p=>[p.id,p]));
 for(const s of reference.sheets){
  let count=0;const local=new Map(),diagram=new Map();
  for(const a of s.inventory){
   if(!expected.has(a.id)||!Number.isSafeInteger(a.q)||a.q<1){errors.push('Invalid inventory row '+a.id);continue;}
   count+=a.q;local.set(a.id,(local.get(a.id)||0)+a.q);totals.set(a.id,(totals.get(a.id)||0)+a.q*s.copies);
   const p=expected.get(a.id);
   if(a.l!==p.l||a.w!==p.w)printDifferences.set(a.id,{id:a.id,original:[p.l,p.w],printed:[a.l,a.w],quantity:p.q});
  }
  for(const a of s.parts){diagram.set(a.id,(diagram.get(a.id)||0)+1);drawn.set(a.id,(drawn.get(a.id)||0)+s.copies);}
  if(count!==s.declaredParts||s.parts.length!==s.declaredParts)errors.push('Sheet count mismatch '+s.sheet);
  for(const id of new Set([...local.keys(),...diagram.keys()]))if(local.get(id)!==diagram.get(id))errors.push('Diagram/inventory mismatch '+s.sheet+':'+id);
  const leaves=[];
  function walk(n){if(!n){errors.push('Missing topology '+s.sheet);return;}if(n.id!==undefined){leaves.push(n.id);return;}
   if(!['H','V'].includes(n.axis)||!Array.isArray(n.children)||n.children.length<2){errors.push('Invalid strip topology '+s.sheet);return;}n.children.forEach(walk);
  }walk(s.topology);
  const topologyCounts=new Map();leaves.forEach(id=>topologyCounts.set(id,(topologyCounts.get(id)||0)+1));
  for(const id of new Set([...diagram.keys(),...topologyCounts.keys()]))if(diagram.get(id)!==topologyCounts.get(id))errors.push('Topology/diagram mismatch '+s.sheet+':'+id);
  profiles.push({sheet:s.sheet,firstAxis:s.topology?.axis,parts:s.declaredParts});
 }
 for(const p of order.pieces)if(totals.get(p.id)!==p.q||drawn.get(p.id)!==p.q)errors.push('Order quantity mismatch '+p.id);
 const partArea=order.pieces.reduce((s,p)=>s+p.l*p.w*p.q,0),usableArea=(order.sheetW-2*order.trim)*(order.sheetH-2*order.trim);
 return {inventoryMatches:errors.length===0,errors,parts:order.pieces.reduce((s,p)=>s+p.q,0),positions:order.pieces.length,sheets:reference.sheets.reduce((n,s)=>n+s.copies,0),
  partArea,usableAreaPerSheet:usableArea,areaLowerBound:Math.ceil(partArea/usableArea),sheetProfiles:profiles,
  printedSizeDifferences:[...printDifferences.values()].sort((a,b)=>a.id-b.id),printedCutLengthM:Number(reference.sheets.reduce((s,a)=>s+a.printedCutLengthM*a.copies,0).toFixed(2)),
  exactGeometryVerified:false,physicalReplayVerified:false,realMachineFeasibility:'unknown',
  limitations:['PDF coordinates describe the printed drawing, not an exact cutting plan.','Printed fractional dimensions and effective sheet size need confirmation.','Strip topology has no validated cut coordinates, clamp constraints or numbered physical operations.']};
}
module.exports={auditReference};
