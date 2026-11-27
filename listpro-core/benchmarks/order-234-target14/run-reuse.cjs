'use strict';
// Reuse a validated order subset; extend primary rip series only with real parts.
// Every accepted intermediate and the final complete order undergo independent replay.
const {compileCompleted,verifyCompleted}=require('../../src/completed-rip');
const {fromTree,dimensions}=require('../../src/deferred-strip-patterns');
const {searchCompleted}=require('../../src/completed-rip-search');
const {estimateSheets}=require('../../src/sheet-area-estimate');
function reuseAndExtend(p,priorP,prior,{seed=1127,iterations=50,maxGroups=32}={}){
 for(const k of ['sheetW','sheetH','kerf','trim'])if(p[k]!==priorP[k])throw Error('Different stock parameters');
 verifyCompleted(priorP,prior);
 const started=Date.now(),counts=new Map(p.pieces.map(a=>[a.id,0])),oldById=new Map(priorP.pieces.map(a=>[a.id,a]));
 let patterns=prior.sheets.map(s=>fromTree(s.tree,p.kerf));
 function bind(n){
  if(!n.part){n.children.forEach(bind);return;}
  const old=oldById.get(n.part.id);if(!old)throw Error('Unknown prior part');
  const a=p.pieces.find(a=>a.l===old.l&&a.w===old.w&&counts.get(a.id)<a.q&&(a.grain===false||!n.part.rotated));
  if(!a)throw Error('Prior order is not a compatible exact subset');
  counts.set(a.id,counts.get(a.id)+1);n.part={id:a.id,rotated:!!n.part.rotated};
 }
 patterns.forEach(bind);
 const oldCount=[...counts.values()].reduce((a,b)=>a+b,0),partial=()=>({...p,pieces:p.pieces.filter(a=>counts.get(a.id)).map(a=>({...a,q:counts.get(a.id)}))});
 let current=compileCompleted(partial(),patterns);const additions=[],rejections=[];
 for(let pass=0;pass<maxGroups;pass++){
  const choices=[];
  for(let sheet=0;sheet<patterns.length;sheet++){
   const root=dimensions(patterns[sheet],p.kerf),axis=root.axis||prior.sheets[sheet].axis||'H',span=axis==='V'?'w':'h',cross=axis==='V'?'h':'w';
   const cap=axis==='V'?p.sheetW-2*p.trim:p.sheetH-2*p.trim,crossCap=axis==='V'?p.sheetH-2*p.trim:p.sheetW-2*p.trim;
   for(const a of p.pieces){
    const left=a.q-counts.get(a.id);if(!left)continue;
    for(const rotated of a.grain===false&&a.l!==a.w?[false,true]:[false]){
     const part={part:{id:a.id,rotated},w:rotated?a.w:a.l,h:rotated?a.l:a.w};
     const quantity=Math.min(left,Math.floor((cap-root[span])/(part[span]+p.kerf)));
     if(quantity>0&&part[cross]<=crossCap)choices.push({sheet,axis,part,quantity,gain:quantity*a.l*a.w});
    }
   }
  }
  choices.sort((a,b)=>b.gain-a.gain||a.sheet-b.sheet||a.part.part.id-b.part.part.id);
  let accepted=false;
  for(const choice of choices){
   const candidatePatterns=JSON.parse(JSON.stringify(patterns));
   let root=candidatePatterns[choice.sheet];if(root.part)root=candidatePatterns[choice.sheet]={axis:choice.axis,children:[root]};
   for(let j=0;j<choice.quantity;j++)root.children.push(JSON.parse(JSON.stringify(choice.part)));
   counts.set(choice.part.part.id,counts.get(choice.part.part.id)+choice.quantity);
   try{
    const next=compileCompleted(partial(),candidatePatterns);
    for(let i=0;i<current.sheets.length;i++)for(const old of current.sheets[i].parts){
     const a=next.sheets[i].parts.find(a=>a.id===old.id&&a.instance===old.instance);
     if(!a||['x','y','w','h','rotated'].some(k=>a[k]!==old[k]))throw Error('Existing placement moved');
    }
    patterns=candidatePatterns;current=next;additions.push({...choice,pass:pass+1});accepted=true;break;
   }catch(error){counts.set(choice.part.part.id,counts.get(choice.part.part.id)-choice.quantity);rejections.push({sheet:choice.sheet,id:choice.part.part.id,quantity:choice.quantity,error:error.message});}
  }
  if(!accepted)break;
 }
 const remaining={...p,pieces:p.pieces.map(a=>({...a,q:a.q-counts.get(a.id)})).filter(a=>a.q>0)};
 const remainingCount=remaining.pieces.reduce((n,a)=>n+a.q,0);
 const tail=remainingCount?searchCompleted(remaining,{seed,iterations}):null;
 const all=patterns.concat(tail?tail.sheets.map(s=>fromTree(s.tree,p.kerf)):[]);
 const result=compileCompleted(p,all),minimum=estimateSheets(p).minimumSheets;
 result.search={method:'validated-subset-primary-extension-and-independent-tail-search',priorSheets:prior.sheets.length,priorParts:oldCount,addedToExisting:current.metrics.parts-oldCount,remainingParts:remainingCount,tailSheets:tail?.metrics.sheets||0,additions,rejections,seed,iterations,tailSearch:tail?.search||null,elapsedMs:Date.now()-started,positionsPreserved:true,optimality:result.metrics.sheets===minimum?'sheet-count proven by area only':'not proven'};
 return result;
}
module.exports={reuseAndExtend};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),p=require('./input.json');
 const priorInput=path.resolve(process.argv[2]||path.join(__dirname,'../order-221-target13/input.json'));
 const priorResult=path.resolve(process.argv[3]||path.join(__dirname,'../order-221-target13/result.json'));
 const result=reuseAndExtend(p,JSON.parse(fs.readFileSync(priorInput,'utf8')),JSON.parse(fs.readFileSync(priorResult,'utf8')));
 fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(result)+'\n');
 fs.writeFileSync(path.join(__dirname,'patterns.json'),JSON.stringify(result.sheets.map(s=>fromTree(s.tree,p.kerf)),null,2)+'\n');
 console.log(JSON.stringify({metrics:result.metrics,search:result.search}));
}
