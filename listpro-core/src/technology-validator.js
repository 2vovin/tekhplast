'use strict';
// Independent machine-state replay. Does not import planner or optimizer.
const {validate}=require('./validator');
function validateTechnology(p,layout,plan,profile){
 const geometry=validate(p,layout);
 const reject=m=>{throw Error('Technology rejected: '+m);};
 const num=x=>typeof x==='number'&&Number.isFinite(x);
 const same=(a,b)=>a&&b&&['x','y','w','h'].every(k=>num(a[k])&&a[k]===b[k]);
 if(!profile||!profile.id||typeof profile.allowSheetRotation!=='boolean'||typeof profile.allowStripRotation!=='boolean'||
  !Array.isArray(profile.allowedCutAxes)||!profile.allowedCutAxes.length||profile.allowedCutAxes.some(a=>!['V','H'].includes(a))||
  profile.coordinateSystem!=='sheet-fixed-top-left-mm'||profile.kerf!==p.kerf||
  profile.trimMode!=='four-full-span-cuts')reject('incomplete or unsupported equipment profile');
 const hold=profile.workholding;
 if(!hold||hold.mode!=='in-situ-independent-clamps'||hold.allowTranslation!==false||
  !['minBlankWidth','minBlankHeight'].every(k=>num(hold[k])&&hold[k]>=0)||
  !['maxSheetW','maxSheetH','maxCutLength'].every(k=>num(profile[k])&&profile[k]>0))reject('unsupported workholding or limits');
 if(p.sheetW>profile.maxSheetW||p.sheetH>profile.maxSheetH)reject('sheet capacity');
 if(!plan||plan.version!==1||plan.profileId!==profile.id||plan.coordinateSystem!==profile.coordinateSystem||
  !Array.isArray(plan.operations)||!Array.isArray(plan.outputs))reject('plan header');
 const live=new Map(),used=new Set(),loaded=new Set(),expected=new Map(),done=new Set(),leaves=new Map();
 // Tree paths establish which independent blank is required by each geometric cut.
 layout.sheets.forEach((sh,si)=>{
  function tree(n,id){
   if(n.kind==='cut'){expected.set(id,n);tree(n.first,id+'/0');tree(n.second,id+'/1');}
   else leaves.set(id,n);
  }
  tree(sh.tree,'s'+si+(p.trim>0?'/r':'/raw'));
 });
 let cutCount=0,cutLength=0,trimCuts=0,layoutCuts=0;
 const trace=[];
 function create(id,rect,sheet,orientation){
  if(typeof id!=='string'||used.has(id))reject('reused blank ID');
  used.add(id);live.set(id,{rect,sheet,orientation});
 }
 for(let i=0;i<plan.operations.length;i++){
  const op=plan.operations[i];if(op.step!==i+1)reject('operation numbering');
  if(op.type==='rotate'){
   const b=live.get(op.input);if(!b)reject('rotation of unavailable blank');
   if((op.input.endsWith('/raw')&&!profile.allowSheetRotation)||(!op.input.endsWith('/raw')&&!profile.allowStripRotation))reject('forbidden rotation at step '+op.step);
   reject('rotations unsupported by fixed-coordinate replay');
  }
  if(op.type==='translate'||op.type==='rebase')reject('forbidden translation/rebasing');
  if(op.orientation!==0)reject('nonzero orientation at step '+op.step);
  if(op.type==='load'){
   if(!Number.isInteger(op.sheet)||op.sheet<0||op.sheet>=layout.sheets.length||loaded.has(op.sheet)||
    op.blank!=='s'+op.sheet+'/raw'||!same(op.rect,{x:0,y:0,w:p.sheetW,h:p.sheetH}))reject('invalid sheet load');
   loaded.add(op.sheet);create(op.blank,{...op.rect},op.sheet,0);
   trace.push({step:op.step,action:'load',blank:op.blank,orientation:0,liveBlanks:live.size});continue;
  }
  if(op.type!=='cut')reject('unsupported operation');
  const b=live.get(op.input);if(!b)reject('cut of unavailable/consumed blank at step '+op.step);
  const r=b.rect,v=op.axis==='V';
  if(!profile.allowedCutAxes.includes(op.axis))reject('unavailable machine axis '+op.axis+' at step '+op.step);
  if(b.orientation!==0||op.fixture!==hold.mode)reject('orientation or workholding');
  if(r.w<hold.minBlankWidth||r.h<hold.minBlankHeight)reject('blank below clamping limits');
  if(op.kerf!==p.kerf||!num(op.pos)||!Array.isArray(op.children)||op.children.length!==2||op.children[0]===op.children[1])reject('cut specification');
  const d=op.pos-(v?r.x:r.y),span=v?r.w:r.h,len=v?r.h:r.w;
  // A zero-sized first scrap is allowed only for edge trimming exactly one kerf wide.
  if(d<0||(d===0&&op.phase!=='trim')||d+p.kerf>span||len<=0||len>profile.maxCutLength)reject('cut bounds or stroke capacity');
  const from=v?{x:op.pos,y:r.y}:{x:r.x,y:op.pos},to=v?{x:op.pos,y:r.y+r.h}:{x:r.x+r.w,y:op.pos};
  if(!op.from||!op.to||op.from.x!==from.x||op.from.y!==from.y||op.to.x!==to.x||op.to.y!==to.y)reject('machine endpoints');
  const rects=v?[{...r,w:d},{...r,x:op.pos+p.kerf,w:span-d-p.kerf}]:[{...r,h:d},{...r,y:op.pos+p.kerf,h:span-d-p.kerf}];
  const prefix='s'+b.sheet;
  if(op.phase==='layout'){
   const n=expected.get(op.input);
   if(!n||done.has(op.input)||!same(r,n.rect)||n.axis!==op.axis||n.pos!==op.pos||n.number!==op.layoutCutNumber||
    op.children[0]!==op.input+'/0'||op.children[1]!==op.input+'/1')reject('operation differs from geometric tree');
   done.add(op.input);layoutCuts++;
  }else if(op.phase==='trim'){
   if(op.layoutCutNumber!==null||p.trim===0)reject('trim metadata');
   // Enforce a fully specified four-cut stock preparation, not a pretrimmed-sheet assumption.
   const stage=op.input===prefix+'/raw'?0:Number(op.input.slice((prefix+'/trim').length))+1;
   if(!Number.isInteger(stage)||stage<0||stage>3||op.input!==(stage===0?prefix+'/raw':prefix+'/trim'+(stage-1)))reject('trim sequence');
   const axes=['V','V','H','H'],positions=[p.trim-p.kerf,p.sheetW-p.trim,p.trim-p.kerf,p.sheetH-p.trim],keep=[1,0,1,0][stage];
   const next=stage===3?prefix+'/r':prefix+'/trim'+stage,scrap=prefix+'/scrap'+stage;
   if(op.axis!==axes[stage]||op.pos!==positions[stage]||op.children[keep]!==next||op.children[1-keep]!==scrap)reject('trim geometry');
   trimCuts++;
  }else reject('unknown cutting phase');
  live.delete(op.input);
  op.children.forEach((id,j)=>create(id,rects[j],b.sheet,b.orientation));
  cutCount++;cutLength+=len;
  trace.push({step:op.step,action:'cut',input:op.input,axis:op.axis,pos:op.pos,rect:{...r},orientation:b.orientation,children:op.children.slice(),liveBlanks:live.size});
 }
 if(loaded.size!==layout.sheets.length||done.size!==expected.size||trimCuts!==(p.trim>0?4*layout.sheets.length:0))reject('unfinished stock or cuts');
 if(plan.outputs.length!==live.size)reject('missing output blanks');
 const outSeen=new Set();
 for(const out of plan.outputs){
  const b=live.get(out.blank);if(!b||outSeen.has(out.blank)||!same(out.rect,b.rect)||out.orientation!==b.orientation)reject('output state');
  outSeen.add(out.blank);const leaf=leaves.get(out.blank);
  if(leaf){
   if(out.kind!==leaf.kind||(leaf.kind==='part'&&(!out.part||out.part.id!==leaf.part.id||out.part.instance!==leaf.part.instance||out.part.rotated!==leaf.part.rotated)))reject('output part identity');
   leaves.delete(out.blank);
  }else if(!/^s[0-9]+\/scrap[0-3]$/.test(out.blank)||out.kind!=='trim-waste')reject('unexpected final blank');
 }
 if(leaves.size||plan.rotationOperations!==0)reject('unfinished parts or rotation summary');
 return {geometry:{valid:true,...geometry},technology:{valid:true,conditional:true,profileId:profile.id,
  rotations:0,translations:0,loadedSheets:loaded.size,operations:plan.operations.length,
  cuts:cutCount,trimCuts,layoutCuts,cutLength,scope:'Abstract equipment assumptions only; not CNC certification'},trace};
}
function assessTechnology(p,layout,plan,profile){
 let geometry;
 try{geometry=validate(p,layout);}catch(e){return {geometry:{valid:false,reason:e.message},technology:{valid:false,reason:'Geometry invalid'}};}
 try{return validateTechnology(p,layout,plan,profile);}catch(e){return {geometry,technology:{valid:false,profileId:profile&&profile.id,reason:e.message}};}
}
module.exports={validateTechnology,assessTechnology};
