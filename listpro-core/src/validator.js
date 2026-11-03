'use strict';
// Independent replay: no imports from optimizer.
function validate(p,s){
 const fail=m=>{throw Error('Invalid layout: '+m);};
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 if(!p||!['sheetW','sheetH','trim','kerf'].every(k=>finite(p[k]))||p.trim<0||p.kerf<0||p.sheetW<=2*p.trim||p.sheetH<=2*p.trim||!Array.isArray(p.pieces))fail('input');
 const expected=new Map(), key=a=>JSON.stringify([a.id,a.instance]);
 p.pieces.forEach((a,i)=>{
  if(!finite(a.l)||!finite(a.w)||a.l<=0||a.w<=0||!Number.isSafeInteger(a.q)||a.q<1)fail('part input');
  for(let j=1;j<=a.q;j++){const k=key({id:a.id??i+1,instance:j});if(expected.has(k))fail('duplicate input ID');expected.set(k,a);}
 });
 if(!s||!Array.isArray(s.sheets))fail('sheets');
 const seen=new Set(), nodes=new Set();let number=0,length=0,wasteArea=0,largestWaste=0;
 const eq=(a,b)=>a&&['x','y','w','h'].every(k=>finite(a[k])&&a[k]===b[k]);
 for(const sh of s.sheets){
  const parts=new Map();
  function walk(n,r){
   if(!n||nodes.has(n)||!eq(n.rect,r)||r.w<0||r.h<0)fail('rectangle or cycle');
   nodes.add(n);
   if(n.kind==='cut'){
    if(n.number!==++number||n.kerf!==p.kerf||!finite(n.pos)||!['V','H'].includes(n.axis))fail('cut numbering/axis/kerf');
    const v=n.axis==='V', start=v?r.x:r.y, size=v?r.w:r.h, d=n.pos-start;
    if(d<=0||d+p.kerf>size)fail('cut bounds');
    length+=v?r.h:r.w;
    walk(n.first,v?{...r,w:d}:{...r,h:d});
    walk(n.second,v?{...r,x:n.pos+p.kerf,w:size-d-p.kerf}:{...r,y:n.pos+p.kerf,h:size-d-p.kerf});
   }else if(n.kind==='part'){
    const k=key(n.part),a=expected.get(k);
    if(!a||seen.has(k)||typeof n.part.rotated!=='boolean'||(n.part.rotated&&a.grain!==false))fail('instance/rotation');
    if(r.w!==(n.part.rotated?a.w:a.l)||r.h!==(n.part.rotated?a.l:a.w))fail('dimensions');
    seen.add(k);parts.set(k,{...r,...n.part});
   }else if(n.kind==='waste'){wasteArea+=r.w*r.h;largestWaste=Math.max(largestWaste,r.w*r.h);}
   else fail('node kind');
  }
  walk(sh.tree,{x:p.trim,y:p.trim,w:p.sheetW-2*p.trim,h:p.sheetH-2*p.trim});
  if(!Array.isArray(sh.parts)||sh.parts.length!==parts.size)fail('part map');
  const mapped=new Set();
  for(const a of sh.parts){const k=key(a),b=parts.get(k);if(mapped.has(k)||!b||!eq(a,b)||a.rotated!==b.rotated)fail('map mismatch');mapped.add(k);}
 }
 if(seen.size!==expected.size||s.partCount!==expected.size)fail('missing instances');
 return {valid:true,partCount:seen.size,sheets:s.sheets.length,cuts:number,cutLength:length,wasteArea,largestWaste};
}
module.exports={validate};
