'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{compileCompleted}=require('./completed-rip');
function scaled(p){
 const values=[p.sheetW,p.sheetH,p.trim,p.kerf,...p.pieces.flatMap(a=>[a.l,a.w])];
 const scale=[1,10,100,1000].find(s=>values.every(v=>Number.isSafeInteger(Math.round(v*s))&&Math.abs(v*s-Math.round(v*s))<1e-7));
 if(!scale)throw Error('Native engine supports at most three decimal places without rounding');
 return{scale,parameters:{...p,sheetW:Math.round(p.sheetW*scale),sheetH:Math.round(p.sheetH*scale),trim:Math.round(p.trim*scale),kerf:Math.round(p.kerf*scale),pieces:p.pieces.map(a=>({...a,l:Math.round(a.l*scale),w:Math.round(a.w*scale)}))}};
}
// The certificate is an external proposal. Tightening waste keeps the grouping,
// but constructs a NEW plan; only independent PSS replay admits that new plan.
function convert(p,csv,{axis='H',scale=1}={}){
 if(!['H','V'].includes(axis)||!Number.isSafeInteger(scale)||scale<1||Buffer.byteLength(csv)>8*1024*1024)throw Error('Certificate options/size');
 const lines=csv.trim().split(/\r?\n/),columns='PLATE_ID,COPIES,NODE_ID,X,Y,WIDTH,HEIGHT,TYPE,CUT,PARENT';
 if(lines.shift()!==columns||lines.length>20000)throw Error('Certificate header/rows');
 const names=columns.split(','),nodes=new Map(),plates=new Map(),counts=p.pieces.map(()=>0);
 for(const line of lines){const cells=line.split(',');if(cells.length!==names.length)throw Error('Certificate columns');const n=Object.fromEntries(cells.map((v,i)=>[names[i],v===''?null:Number(v)]));
  if(names.some(k=>k!=='PARENT'&&!Number.isSafeInteger(n[k]))||n.PARENT!==null&&!Number.isSafeInteger(n.PARENT)||n.COPIES<1||n.WIDTH<0||n.HEIGHT<0||n.NODE_ID<0||n.PLATE_ID<0)throw Error('Certificate numbers');
  const key=n.PLATE_ID+':'+n.NODE_ID;if(nodes.has(key))throw Error('Duplicate node');n.children=[];nodes.set(key,n);
  if(!plates.has(n.PLATE_ID))plates.set(n.PLATE_ID,{copies:n.COPIES,roots:[]});if(plates.get(n.PLATE_ID).copies!==n.COPIES)throw Error('Inconsistent copies');
 }
 for(const n of nodes.values()){if(n.PARENT===null)plates.get(n.PLATE_ID).roots.push(n);else{const parent=nodes.get(n.PLATE_ID+':'+n.PARENT);if(!parent||n.X<parent.X||n.Y<parent.Y||n.X+n.WIDTH>parent.X+parent.WIDTH||n.Y+n.HEIGHT>parent.Y+parent.HEIGHT)throw Error('Invalid parent/geometry');parent.children.push(n);}}
 const visited=new Set();let totalSheets=0;
 function walk(n,depth=0){if(depth>64||visited.has(n))throw Error('Certificate cycle/depth');visited.add(n);
  if(n.TYPE>=0&&n.CUT>0){if(n.children.length)throw Error('Nonterminal part');const a=p.pieces[n.TYPE];if(!a)throw Error('Unknown part');const w=n.WIDTH/scale,h=n.HEIGHT/scale,rotated=!(w===a.l&&h===a.w);if(rotated&&!(a.grain===false&&w===a.w&&h===a.l))throw Error('Part size/grain');
   if(n.X/scale<p.trim||n.Y/scale<p.trim||(n.X+n.WIDTH)/scale>p.sheetW-p.trim||(n.Y+n.HEIGHT)/scale>p.sheetH-p.trim)throw Error('Part trim');counts[n.TYPE]+=n.COPIES;return{part:{id:a.id,rotated},w,h};}
  const children=n.children.map(child=>({node:child,pattern:walk(child,depth+1)})).filter(c=>c.pattern);
  if(!children.length)return null;
  // Raw sheet -> prepared body does not add a fictitious strip stage.
  if(children.length===1&&children[0].node.CUT===0)return children[0].pattern;
  const stage=children[0].node.CUT;if(stage<1)throw Error('Invalid strip stage');const A=stage%2===1?axis:(axis==='H'?'V':'H');
  children.sort((a,b)=>A==='H'?a.node.Y-b.node.Y:a.node.X-b.node.X);
  for(let i=1;i<children.length;i++){const a=children[i-1].node,b=children[i].node;if(A==='H'?(a.Y+a.HEIGHT+p.kerf*scale>b.Y||a.X!==b.X):(a.X+a.WIDTH+p.kerf*scale>b.X||a.Y!==b.Y))throw Error('Nonparallel certificate strips');}
  return{axis:A,children:children.map(c=>c.pattern)};
 }
 const patterns=[];
 for(const plate of plates.values()){if(plate.roots.length!==1)throw Error('Certificate roots');const root=plate.roots[0];if(root.X!==0||root.Y!==0||root.WIDTH!==p.sheetW*scale||root.HEIGHT!==p.sheetH*scale)throw Error('Certificate sheet size');const pattern=walk(root);if(!pattern)throw Error('Empty sheet');totalSheets+=plate.copies;if(totalSheets>p.pieces.reduce((s,a)=>s+a.q,0))throw Error('Too many sheets');for(let i=0;i<plate.copies;i++)patterns.push(pattern);}
 if(visited.size!==nodes.size||counts.some((n,i)=>n!==p.pieces[i].q))throw Error('Disconnected certificate or incomplete quantities');
 const result=compileCompleted(p,patterns);result.externalEngine={name:'PackingSolver',version:require('../server/packing/pin.json').version,certificateSheets:totalSheets,convertedSheets:result.metrics.sheets,axis,scale,adaptation:'waste tightened; a new physical plan independently replayed',realMachineFeasibility:'unknown'};return result;
}
function runPacking(p,{python=process.env.LISTPRO_PACKING_PYTHON||'/opt/listpro/packing/bin/python',seconds=5,axis='H',stages=3}={}){
 if(!Number.isFinite(seconds)||seconds<=0||seconds>30||![2,3,-1].includes(stages)||!['H','V'].includes(axis))throw Error('Native options');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-native-')),request=path.join(dir,'request.json'),certificate=path.join(dir,'certificate.csv'),summary=path.join(dir,'summary.json'),data=scaled(p),started=Date.now();
 try{fs.writeFileSync(request,JSON.stringify({parameters:data.parameters,seconds,axis,stages}),{mode:0o600});execFileSync(python,[path.join(__dirname,'../server/packing/run.py'),request,certificate,summary],{timeout:Math.ceil((seconds+4)*1000),maxBuffer:1024*1024,env:{...process.env,OMP_NUM_THREADS:'1',OPENBLAS_NUM_THREADS:'1',MKL_NUM_THREADS:'1'},stdio:'pipe'});
  const csv=fs.readFileSync(certificate,'utf8'),result=convert(p,csv,{axis,scale:data.scale});result.externalEngine={...result.externalEngine,stages,seconds,elapsedMs:Date.now()-started};return {result,certificate:csv,summary:JSON.parse(fs.readFileSync(summary,'utf8'))};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
module.exports={scaled,convert,runPacking};
