'use strict';
const {replayPhysical}=require('./physical-replay');
const {validateExam}=require('./exam-validator');
const {renderFrames,intersectCut}=require('./pss-visual');
function exportExam(s){
 const p=s.parameters,profile=s.equipmentProfile,verification=validateExam(p,s,s.plan,profile),r=replayPhysical(p,s,s.plan,profile);
 const frames=r.events.filter(e=>e.kind==='cut').map(e=>{
  const b=e.before,parts=s.sheets[b.sheet].parts.filter(a=>a.x>=b.rect.x&&a.y>=b.rect.y&&a.x+a.w<=b.rect.x+b.rect.w&&a.y+a.h<=b.rect.y+b.rect.h);
  for(const a of parts)if(intersectCut(b.rect,e.materialAxis,e.materialPos,p.kerf,a))throw Error('Attached part intersection');
  return {step:e.op.step,cutIndex:e.op.cutIndex,inputBlankId:e.op.inputBlankId,rect:b.rect,orientation:b.q*90,stage:e.op.stage,start:e.op.start,end:e.op.end,parts,outputs:e.materialOutputs,previous:s.plan.operations.filter(o=>o.step<e.op.step&&(o.inputBlankId===e.op.inputBlankId||o.outputBlankIds?.includes(e.op.inputBlankId))).slice(-3),next:e.materialOutputs.map(a=>({blankId:a.id,turnCount:0,nextOperation:s.plan.operations.find(o=>o.step>e.op.step&&o.inputBlankId===a.id)??null}))};
 });
 function svg(sh,rect){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[rect.x-10,rect.y-45,rect.w+20,rect.h+65].join(' ')+'"><rect x="'+rect.x+'" y="'+rect.y+'" width="'+rect.w+'" height="'+rect.h+'" fill="#eee" stroke="black"/><text x="'+rect.x+'" y="'+(rect.y-15)+'" font-size="24">Corrected exam · abstract staged · machine UNKNOWN</text>'+sh.parts.filter(a=>a.x>=rect.x&&a.y>=rect.y&&a.x+a.w<=rect.x+rect.w&&a.y+a.h<=rect.y+rect.h).map(a=>'<rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="'+(a.id===4?'#fcd34d':'#bbdfdb')+'" stroke="#222"/><text x="'+(a.x+6)+'" y="'+(a.y+25)+'" font-size="22">'+a.id+':'+a.instance+' '+a.w+'×'+a.h+'</text>').join('')+'</svg>';
 }
 const graphics={};
 s.sheets.forEach((sh,i)=>{graphics['bazis-exam-sheet-'+(i+1)+'.svg']=svg(sh,{x:0,y:0,w:p.sheetW,h:p.sheetH});sh.primaryStrips.slice(0,-1).forEach(a=>{graphics['bazis-exam-strip-'+(i+1)+'-'+a.index+'.svg']=svg(sh,a.rect);});});
 return {verification,frames,html:renderFrames({frames}),graphics};
}
module.exports={exportExam};