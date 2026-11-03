'use strict';
const {replayPhysical}=require('./physical-replay');
const {validateBands}=require('./parallel-bands-validator');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function svg(rect,parts,title,extra=''){
 const colors=['#bfdbfe','#bbf7d0','#fde68a','#fecaca','#ddd6fe','#a5f3fc'];
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[rect.x-25,rect.y-85,rect.w+50,rect.h+110].join(' ')+'"><title>'+esc(title)+'</title><rect x="'+rect.x+'" y="'+rect.y+'" width="'+rect.w+'" height="'+rect.h+'" fill="#eee" stroke="#333"/><text x="'+rect.x+'" y="'+(rect.y-30)+'" font-size="28">'+esc(title)+'</text>'+
 parts.map(a=>'<rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="'+colors[(Number(a.id)-1)%6]+'" stroke="#334155" stroke-width="2"/><text x="'+(a.x+7)+'" y="'+(a.y+25)+'" font-size="20">'+esc(a.id+':'+a.instance+' '+a.w+'×'+a.h)+'</text>').join('')+extra+'</svg>';
}
const inside=(a,r)=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h;
function artifacts(s){
 const p=s.parameters,report=validateBands(p,s,s.plan,s.equipmentProfile),r=replayPhysical(p,s,s.plan,s.equipmentProfile),files={};
 for(let si=0;si<s.sheets.length;si++){
  const sh=s.sheets[si],bands=sh.primaryStrips.slice(0,-1),axis=sh.axis;
  const lines=bands.map((b,i)=>{const rr=b.rect,v=axis==='V';return '<rect x="'+rr.x+'" y="'+rr.y+'" width="'+rr.w+'" height="'+rr.h+'" fill="none" stroke="#dc2626" stroke-width="5"/><text x="'+(rr.x+12)+'" y="'+(rr.y+65)+'" font-size="38">S'+(i+1)+' — '+(v?rr.w:rr.h)+' mm</text>';}).join('');
  files['sheet-'+(si+1)+'.svg']=svg({x:0,y:0,w:p.sheetW,h:p.sheetH},sh.parts,'26 деталей · полосный вариант · станок: не подтверждён');
  files['primary-'+(si+1)+'.svg']=svg({x:0,y:0,w:p.sheetW,h:p.sheetH},[],'Первичные полосы · лист не поворачивается',lines);
  for(const b of bands)files['strip-'+(si+1)+'-'+b.index+'.svg']=svg(b.rect,sh.parts.filter(a=>inside(a,b.rect)),'Полоса '+b.index+' · '+b.rect.w+'×'+b.rect.h);
 }
 const frames=[];
 for(const e of r.events.filter(a=>a.kind==='cut')){
  const b=e.before,o=e.op,q=b.q,W=q%2?b.rect.h:b.rect.w,H=q%2?b.rect.w:b.rect.h;
  const parts=s.sheets[b.sheet].parts.filter(a=>inside(a,b.rect)).map(a=>{
   const x=a.x-b.rect.x,y=a.y-b.rect.y;
   const rr=q===0?{x,y,w:a.w,h:a.h}:q===1?{x:b.rect.h-y-a.h,y:x,w:a.h,h:a.w}:q===2?{x:b.rect.w-x-a.w,y:b.rect.h-y-a.h,w:a.w,h:a.h}:{x:y,y:b.rect.w-x-a.w,w:a.h,h:a.w};return {...a,...rr};
  });
  const v=o.axis==='V',band='<rect x="'+o.start.x+'" y="'+o.start.y+'" width="'+(v?p.kerf:W)+'" height="'+(v?H:p.kerf)+'" fill="#dc2626"/>';
  const name='cuts/cut-'+String(o.cutIndex).padStart(3,'0')+'.svg';
  files[name]=svg({x:0,y:0,w:W,h:H},parts,'CUT '+o.cutIndex+' · шаг '+o.step+' · '+W+'×'+H+' · '+b.q*90+'°',band);
  frames.push({step:o.step,cut:o.cutIndex,input:o.inputBlankId,rect:b.rect,orientation:b.q*90,outputs:e.materialOutputs,file:name});
 }
 for(let i=0;i<s.plan.groups.length;i++){
  const g=s.plan.groups[i],b=r.blanks.find(a=>a.blankId===g.rootBlankId);
  files['groups/group-'+(i+1)+'.svg']=svg(b.materialRect,s.sheets[b.sheet].parts.filter(a=>inside(a,b.materialRect)),'Группа '+(i+1)+' · ось '+g.axis+' · шаги '+g.cutSteps.join(', '));
 }
 const rows=s.plan.operations.map(o=>'<tr><td>'+o.step+'</td><td>'+esc(o.type)+'</td><td>'+esc(o.inputBlankId??o.blankId??'')+'</td><td>'+esc((o.outputBlankIds??o.stripBlankIds??[]).join(', '))+'</td><td>'+esc(o.materialRect?JSON.stringify(o.materialRect):'')+'</td><td>'+esc(o.machineOrientation??o.toOrientation??'')+'</td><td>'+esc(o.axis??'')+'</td><td>'+esc(o.start?JSON.stringify(o.start):'')+'</td></tr>').join('');
 files['operations.html']='<!doctype html><html lang="ru"><meta charset="utf-8"><title>Полосный раскрой — операции</title><style>body{font:16px system-ui;margin:24px}svg{width:100%;max-height:650px}td,th{border:1px solid #aaa;padding:6px;overflow-wrap:anywhere}table{border-collapse:collapse}section{margin:24px 0;padding:15px;border:1px solid #aaa}</style><h1>Полосы → подполосы → детали</h1><p>Лист не поворачивается. Последняя полоса явно задана перед торцовкой края; это условная модель, параметры станка не подтверждены.</p><table><tr><th>Шаг</th><th>Операция</th><th>Вход</th><th>Выходы</th><th>Материальные координаты</th><th>Ориентация</th><th>Ось</th><th>Начало реза</th></tr>'+rows+'</table>'+frames.map(f=>'<section><h2>CUT '+f.cut+' / шаг '+f.step+'</h2><p>'+esc(f.input)+'</p>'+files[f.file]+'<p>Полученные заготовки: '+esc(JSON.stringify(f.outputs))+'</p></section>').join('')+'</html>';
 files['operations.md']='# Нумерованные операции\n\nВсе координаты CUT — локальные машинные. Поворот исходного листа: 0. Совместимость со станком: unknown.\n\n|Шаг|Операция|Вход|Выходы|Материальный прямоугольник|Ориентация|Ось|Начало реза|\n|---:|---|---|---|---|---:|---|---|\n'+s.plan.operations.map(o=>'|'+[o.step,o.type,o.inputBlankId??o.blankId??'',(o.outputBlankIds??o.stripBlankIds??[]).join(', '),o.materialRect?JSON.stringify(o.materialRect):'',o.machineOrientation??o.toOrientation??'',o.axis??'',o.start?JSON.stringify(o.start):''].join('|')+'|').join('\n')+'\n';
 files['frames.json']=JSON.stringify(frames,null,2)+'\n';files['verification.json']=JSON.stringify(report,null,2)+'\n';
 files['result.json']=JSON.stringify(s,null,2)+'\n';return files;
}
module.exports={artifacts,svg};
