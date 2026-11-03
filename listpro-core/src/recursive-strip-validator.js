'use strict';
// Independent checker: imports replay only, never the recursive optimizer/planner.
const {validateExam}=require('./exam-validator');
const {replayPhysical}=require('./physical-replay');
const eq=(a,b)=>a&&b&&['x','y','w','h'].every(k=>a[k]===b[k]);
function validateRecursive(p,layout,plan,profile){
 if(profile.mode!=='PANEL_SAW_STAGED'||profile.firstCutAxis!=='V'||profile.maxTurnsPerBlank!==1)throw Error('Unsupported recursive staged profile');
 const verified=validateExam(p,layout,plan,profile);
 const replay=replayPhysical(p,layout,plan,profile);
 let count=0;
 layout.sheets.forEach((sh,si)=>{
  let node=sh.tree,path='r';
  if(!Array.isArray(sh.primaryStrips)||sh.primaryStrips.length<2)throw Error('Missing primary inventory');
  sh.primaryStrips.forEach((strip,i)=>{
   const last=i===sh.primaryStrips.length-1;
   if(strip.index!==i+1||strip.path!==(last?path:path+'/0'))throw Error('False strip path/index');
   if(last){if(node.kind!=='waste'||!eq(node.rect,strip.rect))throw Error('Main remainder promoted');return;}
   if(node.kind!=='cut'||node.axis!=='V'||!eq(node.first.rect,strip.rect))throw Error('False strip geometry');
   const physical=plan.primaryStrips?.[count++];
   if(!physical||physical.sheet!==si||physical.stripIndex!==i+1||physical.geometryPath!==strip.path)throw Error('False physical strip metadata');
   const created=replay.blanks.find(b=>b.blankId===physical.blankId);
   if(!created||!eq(created.materialRect,physical.materialRect)||created.materialRect.x!==strip.rect.x||created.materialRect.w!==strip.rect.w||created.materialRect.y!==0||created.materialRect.h!==p.sheetH)throw Error('Strip not physically detached');
   node=node.second;path+='/1';
  });
 });
 if(count!==plan.primaryStrips.length)throw Error('Extra strips');
 for(const e of replay.events){
  if(e.kind!=='cut')continue;
  const r=e.before.rect,v=e.materialAxis==='V',pos=e.materialPos;
  for(const a of layout.sheets[e.before.sheet].parts){
   const inside=a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h;
   const start=v?a.x:a.y,end=start+(v?a.w:a.h);
   if(inside&&pos<end&&pos+p.kerf>start)throw Error('CUT intersects attached part at step '+e.op.step);
  }
 }
 return {...verified,abstractCutPlanValid:true};
}
module.exports={validateRecursive};