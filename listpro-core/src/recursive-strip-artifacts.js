'use strict';
const {exportExam}=require('./exam-export');
const {validateRecursive}=require('./recursive-strip-validator');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function svg(rect,parts,title,lines=[]){
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[rect.x-10,rect.y-65,rect.w+20,rect.h+85].join(' ')+'"><title>'+esc(title)+'</title><rect x="'+rect.x+'" y="'+rect.y+'" width="'+rect.w+'" height="'+rect.h+'" fill="#eee" stroke="black"/><text x="'+rect.x+'" y="'+(rect.y-20)+'" font-size="24">'+esc(title)+'</text>'+
 parts.map(a=>'<rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="#bfdbfe" stroke="#222"/><text x="'+(a.x+5)+'" y="'+(a.y+22)+'" font-size="20">'+esc(a.id+':'+a.instance+' '+a.w+'×'+a.h)+'</text>').join('')+lines.join('')+'</svg>';
}
function artifacts(result){
 const p=result.parameters,verification=validateRecursive(p,result,result.plan,result.equipmentProfile);
 const exported=exportExam(result),files={};
 result.sheets.forEach((sh,i)=>{
  files['brain2-sheet-'+(i+1)+'.svg']=svg({x:0,y:0,w:p.sheetW,h:p.sheetH},sh.parts,'Brain 2.0 · sheet '+(i+1)+' · machine UNKNOWN');
  sh.primaryStrips.slice(0,-1).forEach(s=>{
   const r=s.rect;files['brain2-strip-'+(i+1)+'-'+s.index+'.svg']=svg(r,sh.parts.filter(a=>a.x>=r.x&&a.x+a.w<=r.x+r.w),'Strip '+s.index+' · '+r.w+'×'+r.h);
  });
  const lines=sh.primaryStrips.slice(0,-1).map(s=>{
   const op=result.plan.operations.find(o=>o.type==='cut'&&o.phase==='primary'&&o.materialPos===s.rect.x+s.rect.w&&o.inputBlankId.startsWith('s'+i+'/'));
   return '<line x1="'+(s.rect.x+s.rect.w)+'" x2="'+(s.rect.x+s.rect.w)+'" y1="0" y2="'+p.sheetH+'" stroke="#dc2626" stroke-width="5"/><text x="'+(s.rect.x+15)+'" y="80" font-size="36">Strip '+s.index+' · '+s.rect.w+' mm · CUT '+op.cutIndex+' / step '+op.step+'</text>';
  });
  files['primary-strips-'+(i+1)+'.svg']=svg({x:0,y:0,w:p.sheetW,h:p.sheetH},[],'Primary separation · final residue remains waste',lines);
 });
 const cards=exported.frames.map(frame=>{
  const r=frame.rect,q=frame.orientation/90,W=q%2?r.h:r.w,H=q%2?r.w:r.h;
  const parts=frame.parts.map(a=>{
   const x=a.x-r.x,y=a.y-r.y;
   const t=q===0?{x,y,w:a.w,h:a.h}:q===1?{x:r.h-y-a.h,y:x,w:a.h,h:a.w}:q===2?{x:r.w-x-a.w,y:r.h-y-a.h,w:a.w,h:a.h}:{x:y,y:r.w-x-a.w,w:a.h,h:a.w};
   return {...a,...t};
  });
  const v=frame.start.x===frame.end.x;
  const band='<rect x="'+frame.start.x+'" y="'+frame.start.y+'" width="'+(v?p.kerf:W)+'" height="'+(v?H:p.kerf)+'" fill="#dc2626"/>';
  const graphic=svg({x:0,y:0,w:W,h:H},parts,'CUT '+frame.cutIndex+' · step '+frame.step+' · '+W+'×'+H+' · '+frame.orientation+'°',[band]);
  files['cuts/cut-'+String(frame.cutIndex).padStart(3,'0')+'.svg']=graphic;
  return '<section><h2>CUT '+frame.cutIndex+' — step '+frame.step+'</h2><p>Input '+esc(frame.inputBlankId)+'; stage '+frame.stage+'; material '+esc(JSON.stringify(r))+'</p>'+graphic+
   '<p>Children (new turn counters = 0):</p><ul>'+frame.outputs.map(o=>'<li>'+esc(o.id)+' — '+esc(JSON.stringify(o.rect))+'; next '+esc(JSON.stringify(frame.next.find(a=>a.blankId===o.id)?.nextOperation??'terminal'))+'</li>').join('')+'</ul></section>';
 });
 files['operations.html']='<!doctype html><html lang="en"><meta charset="utf-8"><title>Brain 2.0 physical replay</title><style>body{font:16px system-ui;margin:24px;background:#f8fafc}section{border:1px solid #94a3b8;padding:16px;margin:20px 0;background:white}svg{width:100%;max-height:650px}li{overflow-wrap:anywhere}</style><h1>Brain 2.0 — physical cutting replay</h1><p>Geometry and abstract staged plan validated. Machine feasibility UNKNOWN. Red band = kerf, local machine coordinates. Grain is checked in original material coordinates.</p>'+cards.join('')+'</html>';
 files['verification.json']=JSON.stringify(verification,null,2)+'\n';
 files['frames.json']=JSON.stringify(exported.frames,null,2)+'\n';
 files['result.json']=JSON.stringify(result,null,2)+'\n';
 files['operations.md']='# Brain 2.0 — physical operations\n\nMachine feasibility: unknown. CUT endpoints use local coordinates of the current physical blank. Material rectangles retain original grain coordinates. All dimensions are mm.\n\n|Step|Type|Input|Output|Material x,y,w,h|Orientation|Machine axis and segment|\n|---:|---|---|---|---|---|---|\n'+result.plan.operations.map(o=>'|'+[o.step,o.type,o.inputBlankId??o.blankId??'',(o.outputBlankIds??o.stripBlankIds??[]).join(', '),o.materialRect?Object.values(o.materialRect).join(', '):'',o.machineOrientation??o.toOrientation??'',o.type==='cut'?o.axis+' '+JSON.stringify(o.start)+' → '+JSON.stringify(o.end):''].map(esc).join('|')+'|').join('\n')+'\n';
 return files;
}
module.exports={artifacts};
