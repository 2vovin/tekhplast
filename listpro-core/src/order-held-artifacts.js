'use strict';
const {replayPhysical}=require('./physical-replay');
const {validateHeld}=require('./held-strip-validator');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inside=(a,r)=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h;
function svg(r,parts,title,extra=''){
 const colors=['#bfdbfe','#bbf7d0','#fde68a','#fecaca','#ddd6fe','#a5f3fc'];
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[r.x-20,r.y-75,r.w+40,r.h+95].join(' ')+'"><title>'+esc(title)+'</title><text x="'+r.x+'" y="'+(r.y-25)+'" font-size="28">'+esc(title)+'</text><rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="#eee" stroke="#555"/>'+
 parts.map(a=>{
  const font=Math.min(24,Math.max(9,Math.min(a.w,a.h)*.23)),cx=a.x+a.w/2,cy=a.y+a.h/2,vertical=a.w<100&&a.h>a.w;
  return '<g><title>'+esc(a.id+':'+a.instance+' '+a.w+'×'+a.h+(a.rotated?' (поворот детали 90°)':''))+'</title><rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="'+colors[(a.id-1)%colors.length]+'" stroke="#334155"/><text text-anchor="middle" dominant-baseline="middle" x="'+cx+'" y="'+cy+'" font-size="'+font+'"'+(vertical?' transform="rotate(-90 '+cx+' '+cy+')"':'')+'>'+esc(a.id+':'+a.instance+(a.rotated?' ↻':''))+'</text></g>';
 }).join('')+extra+'</svg>';
}
function browser(){
 const data=JSON.parse(document.getElementById('data').textContent),ns='http://www.w3.org/2000/svg';
 const $=id=>document.getElementById(id),sel=$('sheet'),slider=$('step');let frames=[];
 function tag(name,attrs,text){const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!=null)e.textContent=text;return e;}
 function rect(a,r,q){
  const x=a.x-r.x,y=a.y-r.y,w=a.w,h=a.h;
  return q===0?{x,y,w,h}:q===1?{x:r.h-y-h,y:x,w:h,h:w}:q===2?{x:r.w-x-w,y:r.h-y-h,w,h}:{x:y,y:r.w-x-w,w:h,h:w};
 }
 function draw(){
  const f=frames[Number(slider.value)];if(!f)return;const sh=data.sheets[Number(sel.value)],v=$('drawing');
  const q=f.q,size=q%2?{w:f.rect.h,h:f.rect.w}:{w:f.rect.w,h:f.rect.h};
  v.replaceChildren();v.setAttribute('viewBox',[-30,-30,size.w+60,size.h+60].join(' '));
  v.appendChild(tag('rect',{x:0,y:0,width:size.w,height:size.h,fill:'#eee',stroke:'#555'}));
  for(const a of sh.parts)if(a.x>=f.rect.x&&a.y>=f.rect.y&&a.x+a.w<=f.rect.x+f.rect.w&&a.y+a.h<=f.rect.y+f.rect.h){
   const t=rect(a,f.rect,q);v.appendChild(tag('rect',{x:t.x,y:t.y,width:t.w,height:t.h,fill:'#bfdbfe',stroke:'#334155'}));
   v.appendChild(tag('text',{x:t.x+3,y:t.y+Math.min(22,t.h/2),'font-size':Math.min(20,t.h/3)},a.id+':'+a.instance));
  }
  if(f.type==='cut'){
   const o=f.op;v.appendChild(tag('line',{x1:o.start.x,y1:o.start.y,x2:o.end.x,y2:o.end.y,stroke:'#dc2626','stroke-width':5}));
   for(const c of f.children){const t=rect(c.rect,f.rect,q);v.appendChild(tag('rect',{x:t.x,y:t.y,width:t.w,height:t.h,fill:'none',stroke:c.held?'#dc2626':'#16a34a','stroke-width':3}));}
  }
  $('caption').textContent='Шаг '+f.step+' · '+(f.type==='cut'?'CUT №'+f.op.cutIndex:'ROTATE 90°')+' · '+size.w+'×'+size.h+' мм · ориентация '+q*90+'°';
  $('details').textContent=f.id+'\n'+(f.type==='cut'?'Ось станка '+f.op.axis+'; отрезок '+JSON.stringify(f.op.start)+' → '+JSON.stringify(f.op.end)+'\n'+f.children.map(c=>c.id+' '+c.rect.w+'×'+c.rect.h+' '+c.role).join('\n'):'Отделённая заготовка: '+f.op.fromOrientation+'° → '+f.op.toOrientation+'°');
  $('position').textContent=(Number(slider.value)+1)+' / '+frames.length;
 }
 function select(){frames=data.frames.filter(f=>f.sheet===Number(sel.value));slider.max=Math.max(0,frames.length-1);slider.value=0;draw();}
 data.sheets.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent='Лист '+(i+1)+' · '+s.parts.length+' деталей';sel.appendChild(o);});
 $('prev').onclick=()=>{slider.value=Math.max(0,Number(slider.value)-1);draw();};
 $('next').onclick=()=>{slider.value=Math.min(Number(slider.max),Number(slider.value)+1);draw();};
 slider.oninput=draw;sel.onchange=select;select();
}
function artifacts(s){
 const p=s.parameters,report=validateHeld(p,s,s.plan,s.equipmentProfile),replay=replayPhysical(p,s,s.plan,s.equipmentProfile),files={};
 const roles=new Map(report.roleFrames.map(f=>[f.step,f])),frames=[],summary=[];
 for(const e of replay.events)if(e.kind==='cut'||e.kind==='rotate')frames.push({
  sheet:e.before.sheet,step:e.op.step,type:e.kind,id:e.op.inputBlankId,rect:e.before.rect,q:e.before.q,
  op:{cutIndex:e.op.cutIndex,axis:e.op.axis,start:e.op.start,end:e.op.end,fromOrientation:e.op.fromOrientation,toOrientation:e.op.toOrientation},
  children:roles.get(e.op.step)?.outputs||[]});
 for(let i=0;i<s.sheets.length;i++){
  const sh=s.sheets[i],r={x:0,y:0,w:p.sheetW,h:p.sheetH},bands=sh.primaryStrips.slice(0,-1);
  files['sheet-'+(i+1)+'.svg']=svg(r,sh.parts,'Лист '+(i+1)+' · '+sh.parts.length+' деталей · станок не подтверждён');
  files['primary-'+(i+1)+'.svg']=svg(r,[],'Лист '+(i+1)+' · первичные полосы',bands.map((b,j)=>'<rect x="'+b.rect.x+'" y="'+b.rect.y+'" width="'+b.rect.w+'" height="'+b.rect.h+'" fill="none" stroke="#dc2626" stroke-width="3"/><text x="'+(b.rect.x+10)+'" y="'+(b.rect.y+35)+'" font-size="28">S'+(j+1)+' · '+b.rect.w+'×'+b.rect.h+'</text>').join(''));
  for(const [j,b]of bands.entries())files['strip-'+(i+1)+'-'+(j+1)+'.svg']=svg(b.rect,sh.parts.filter(a=>inside(a,b.rect)),'Лист '+(i+1)+' / полоса '+(j+1)+' · '+b.rect.w+'×'+b.rect.h);
  const ev=replay.events.filter(e=>e.before?.sheet===i),cuts=ev.filter(e=>e.kind==='cut'),turns=ev.filter(e=>e.kind==='rotate').length;
  const rem=replay.usableRemnants.filter(a=>a.sheet===i).sort((a,b)=>b.area-a.area);
  summary.push({sheet:i+1,parts:sh.parts.length,primaryStrips:bands.length,cuts:cuts.length,turns,cutLength:cuts.reduce((n,e)=>n+(e.op.axis==='H'?e.op.w:e.op.h),0),largestRemnant:rem[0]?.rect??null,largestWaste:rem[0]?.area??0,usedArea:sh.parts.reduce((n,a)=>n+a.w*a.h,0)});
 }
 const rows=s.sheets.flatMap((sh,i)=>sh.parts.map(a=>{const original=p.pieces.find(x=>x.id===a.id);return[a.id,a.instance,i+1,a.x,a.y,a.w,a.h,a.rotated,original.l,original.w];}));
 files['parts.csv']='row;instance;sheet;x;y;placedWidth;placedHeight;rotated;orderedLength;orderedWidth\n'+rows.map(r=>r.join(';')).join('\n')+'\n';
 files['operations.csv']='step;operation;inputBlankId;outputBlankIds;machineWidth;machineHeight;orientation;axis;startX;startY;endX;endY;feedMode\n'+s.plan.operations.map(o=>[o.step,o.type,o.inputBlankId||o.blankId||'',(o.outputBlankIds||o.stripBlankIds||[]).join('|'),o.w??'',o.h??'',o.machineOrientation??o.fromOrientation??'',o.axis??'',o.start?.x??'',o.start?.y??'',o.end?.x??'',o.end?.y??'',o.feedMode??''].join(';')).join('\n')+'\n';
 files['operations.md']='# Последовательность обработки\n\nРазмеры — мм; координаты реза локальные машинные. Удерживаемые остатки не поворачиваются. advance-in-place: подача без вынимания; load-detached: загрузка отделённой полосы.\n\n|Шаг|Тип|Вход|Размеры|Ориентация|CUT|Ось|Начало|Подача|\n|---:|---|---|---|---:|---:|---|---|---|\n'+s.plan.operations.map(o=>'|'+[o.step,o.type,o.inputBlankId||o.blankId||'',o.w!=null?o.w+'×'+o.h:'',o.machineOrientation??o.fromOrientation??'',o.cutIndex??'',o.axis??'',o.start?o.start.x+','+o.start.y:'',o.feedMode??''].join('|')+'|').join('\n')+'\n';
 const data=JSON.stringify({sheets:s.sheets.map(sh=>({parts:sh.parts})),frames}).replace(/</g,'\\u003c');
 files['replay.html']='<!doctype html><html lang="ru"><meta charset="utf-8"><title>'+report.metrics.parts+' деталей — физический replay</title><style>body{font:17px system-ui;margin:24px}svg{width:100%;height:65vh}pre{white-space:pre-wrap;overflow-wrap:anywhere}input{width:50%}button,select{font:inherit;padding:8px}a{margin:6px}</style><h1>'+report.metrics.parts+' деталей · пошаговый распил</h1><p>Параметры станка не подтверждены. Показана текущая физическая заготовка до операции. Зелёный контур: отделённая часть; красный: удерживаемая часть / линия CUT. На кадре ROTATE показано исходное положение.</p><select id="sheet"></select><button id="prev">←</button><input id="step" type="range" min="0" value="0"><button id="next">→</button><span id="position"></span><h2 id="caption"></h2><svg id="drawing"></svg><pre id="details"></pre><script id="data" type="application/json">'+data+'</script><script>('+browser.toString()+')();</script></html>';
 files['result.json']=JSON.stringify(s)+'\n';
 files['verification.json']=JSON.stringify(report,null,2)+'\n';
 files['sheets.json']=JSON.stringify(summary,null,2)+'\n';
 files['frames.json']=JSON.stringify(frames)+'\n';
 return files;
}
module.exports={artifacts,svg};
