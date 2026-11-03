'use strict';
const {replayPhysical}=require('./physical-replay');
const {validatePSS}=require('./pss-validator');
function intersectCut(rect,axis,pos,kerf,part){return axis==='V'?part.x<pos+kerf&&part.x+part.w>pos&&part.y<rect.y+rect.h&&part.y+part.h>rect.y:part.y<pos+kerf&&part.y+part.h>pos&&part.x<rect.x+rect.w&&part.x+part.w>rect.x;}
function visualReplay(p,s,profile){
 const replay=replayPhysical(p,s,s.plan,profile),abstract=validatePSS(p,s,s.plan,profile),frames=[];
 for(const e of replay.events)if(e.kind==='cut'){
  const b=e.before,r=b.rect,parts=s.sheets[b.sheet].parts.filter(a=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h);
  for(const a of parts)if(intersectCut(r,e.materialAxis,e.materialPos,p.kerf,a))throw Error('CUT intersects attached part '+a.id+':'+a.instance+' step '+e.op.step);
  frames.push({step:e.op.step,cutIndex:e.op.cutIndex,inputBlankId:e.op.inputBlankId,rect:r,orientation:b.q*90,stage:e.op.stage,axis:e.op.axis,start:e.op.start,end:e.op.end,materialAxis:e.materialAxis,materialPos:e.materialPos,parts,outputs:e.materialOutputs,previous:s.plan.operations.filter(o=>o.step<e.op.step&&(o.inputBlankId===e.op.inputBlankId||o.outputBlankIds?.includes(e.op.inputBlankId))).slice(-3),next:e.materialOutputs.map(o=>({blankId:o.id,turnCount:0,nextOperation:s.plan.operations.find(a=>a.step>e.op.step&&a.inputBlankId===o.id)??null}))});
 }
 return {geometryValid:true,abstractStagedValid:abstract.panelSawStagedValid,machineFeasibility:'unknown',machineFeasibilityUnknown:true,machineFeasibilityConfirmed:false,machineFeasibilityRejected:false,reason:'No verified concrete machine cycle, chain-turn, refeed, stage and holding specification',frames};
}
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function machineRect(a,r,q){
 const x=a.x-r.x,y=a.y-r.y;
 if(q===0)return {x,y,w:a.w,h:a.h};
 if(q===1)return {x:r.h-y-a.h,y:x,w:a.h,h:a.w};
 if(q===2)return {x:r.w-x-a.w,y:r.h-y-a.h,w:a.w,h:a.h};
 return {x:y,y:r.w-x-a.w,w:a.h,h:a.w};
}
function renderFrames(result){
 return '<!doctype html><meta charset="utf-8"><title>PSS 1.6 — абстрактный replay</title><style>body{font:16px sans-serif;margin:24px}article{border:1px solid #999;padding:16px;margin:20px 0}svg{width:100%;max-height:450px}pre{white-space:pre-wrap}</style><h1>PSS 1.6: текущие физические заготовки</h1><p>Геометрия корректна; абстрактное дерево проверено. Соответствие конкретному станку НЕ ПОДТВЕРЖДЕНО.</p>'+result.frames.map(f=>{
 const q=f.orientation/90,W=q%2?f.rect.h:f.rect.w,H=q%2?f.rect.w:f.rect.h;
 return '<article id="cut-'+f.cutIndex+'"><h2>CUT '+f.cutIndex+' · шаг '+f.step+'</h2><p>'+esc(f.inputBlankId)+' · '+W+'×'+H+' · '+f.orientation+'° · стадия '+f.stage+'</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 '+(W+30)+' '+(H+30)+'"><rect width="'+W+'" height="'+H+'" fill="#eee" stroke="black"/>'+f.parts.map(a=>{const t=machineRect(a,f.rect,q);return '<rect x="'+t.x+'" y="'+t.y+'" width="'+t.w+'" height="'+t.h+'" fill="#bbdfbb" stroke="#333"/><text x="'+(t.x+5)+'" y="'+(t.y+25)+'" font-size="22">'+esc(a.id)+':'+a.instance+'</text>';}).join('')+'<line x1="'+f.start.x+'" y1="'+f.start.y+'" x2="'+f.end.x+'" y2="'+f.end.y+'" stroke="red" stroke-width="5"/></svg><h3>Полученные части и следующие операции плана</h3><pre>'+esc(JSON.stringify({outputs:f.outputs,next:f.next,previous:f.previous},null,2))+'</pre><p>Дети получают turnCount=0; перечисленные действия разрешены только в абстрактном профиле.</p></article>';
 }).join('');
}
module.exports={visualReplay,renderFrames,intersectCut,machineRect};
