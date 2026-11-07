'use strict';
const fs=require('node:fs'),path=require('node:path'),p=require('./input.json'),r=require('./result.json'),{check}=require('./verify.cjs');
const out=path.resolve(process.argv[2]||__dirname),verification=check();fs.mkdirSync(out,{recursive:true});
const put=(name,value)=>fs.writeFileSync(path.join(out,name),value),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#bedcf8','#c6ead7','#e1d5f9','#ffe2aa','#f6cddd','#b8e7ed'];
const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
function drawing(rect,parts,title,extra=''){
 let text='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[rect.x-70,rect.y-95,rect.w+95,rect.h+120].join(' ')+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><rect x="'+rect.x+'" y="'+rect.y+'" width="'+rect.w+'" height="'+rect.h+'" fill="#f1f4f7" stroke="#52647b" stroke-width="3"/>';
 text+='<text x="'+(rect.x+rect.w/2)+'" y="'+(rect.y-35)+'" text-anchor="middle" font-size="32">'+rect.w+' мм</text><text transform="translate('+(rect.x-32)+' '+(rect.y+rect.h/2)+') rotate(-90)" text-anchor="middle" font-size="32">'+rect.h+' мм</text>';
 for(const a of parts){const f=Math.min(34,Math.min(a.w,a.h)*.45,a.w/(String(a.id).length*.7+1)),original=p.pieces.find(b=>b.id===a.id);
  text+='<g><title>№'+a.id+' · заказ '+original.l+'×'+original.w+' мм'+(a.rotated?' · повёрнута':'')+'</title><rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="'+colors[(a.id-1)%colors.length]+'" stroke="#5d788c" stroke-width="1.5"/><text x="'+(a.x+a.w/2)+'" y="'+(a.y+a.h/2)+'" text-anchor="middle" dominant-baseline="central" font-size="'+f+'" font-weight="600">'+a.id+'</text>';
  if(Math.min(a.w,a.h)>=160){text+='<text x="'+(a.x+a.w/2)+'" y="'+(a.y+12)+'" text-anchor="middle" dominant-baseline="hanging" font-size="24">'+a.w+'</text><text transform="translate('+(a.x+17)+' '+(a.y+a.h/2)+') rotate(-90)" text-anchor="middle" font-size="24">'+a.h+'</text>';}
  text+='</g>';
 }return text+extra+'</svg>';
}
const summaries=[],articles=[];
for(const [i,sh]of r.sheets.entries()){
 const title='Лист '+(i+1)+' · '+sh.parts.length+' деталей',rect={x:0,y:0,w:p.sheetW,h:p.sheetH},svg=drawing(rect,sh.parts,title);
 put('sheet-'+(i+1)+'.svg',svg);
 const strips=r.plan.primaryStrips.filter(s=>s.sheet===i);
 const outlines=strips.map((s,j)=>'<rect x="'+s.materialRect.x+'" y="'+s.materialRect.y+'" width="'+s.materialRect.w+'" height="'+s.materialRect.h+'" fill="none" stroke="#c53030" stroke-width="5"/><text x="'+(s.materialRect.x+20)+'" y="'+(s.materialRect.y+40)+'" font-size="32">S'+(j+1)+' · '+s.materialRect.w+'×'+s.materialRect.h+'</text>').join('');
 put('primary-'+(i+1)+'.svg',drawing(rect,[],title+' · первичные полосы',outlines));
 for(const s of strips)put('strip-'+(i+1)+'-'+s.stripIndex+'.svg',drawing(s.materialRect,sh.parts.filter(a=>inside(a,s.materialRect)),title+' · полоса '+s.stripIndex));
 const counts=new Map();for(const a of sh.parts)counts.set(a.id,(counts.get(a.id)||0)+1);
 const rows=[...counts].sort((a,b)=>a[0]-b[0]).map(([id,q])=>{const a=p.pieces.find(a=>a.id===id);return'<tr><td>'+id+'</td><td>'+a.l+'×'+a.w+'</td><td>'+q+'</td></tr>';}).join('');
 const area=sh.parts.reduce((s,a)=>s+a.w*a.h,0),summary={sheet:i+1,parts:sh.parts.length,partAreaMm2:area,grossUtilization:area/(p.sheetW*p.sheetH),primaryAxis:sh.axis,primaryStrips:strips.map(s=>({index:s.stripIndex,...s.materialRect}))};summaries.push(summary);
 articles.push('<article><h2>'+title+'</h2><p>2750×1830 мм · пропил 5 мм · обрезка 10 мм · заполнение '+(summary.grossUtilization*100).toFixed(2)+'%</p><div class="layout">'+svg+'<aside><b>Детали листа</b><table><thead><tr><th>№</th><th>Размер, мм</th><th>Шт.</th></tr></thead><tbody>'+rows+'</tbody></table></aside></div><footer>Номера — строки исходного заказа. Повороты разрешены. PSS проверен; параметры конкретного станка не подтверждены.</footer><nav><a href="primary-'+(i+1)+'.svg">Первичные полосы</a> · <a href="sequence.html">Последовательность операций</a></nav></article>');
}
put('maps.html','<!doctype html><html lang="ru"><meta charset="utf-8"><title>ListPro · 187 деталей на 16 листах</title><style>body{font:14px Arial,sans-serif;margin:18px;color:#183249;background:#f7f9fb}h1{font-size:23px}h2{font-size:17px;margin:0 0 5px}article>p,footer{font-size:11px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}article{background:white;border:1px solid #cbd5e1;border-radius:10px;padding:12px;break-inside:avoid}.layout{display:grid;grid-template-columns:minmax(0,1fr) 140px;gap:10px;align-items:start}svg{width:100%;max-height:80vh}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border-bottom:1px solid #e4e9ef;padding:4px 2px;text-align:left;white-space:nowrap}aside b{font-size:12px}header{margin-bottom:16px}button{padding:7px 14px;margin:4px}footer{color:#607086;margin-top:8px}nav{font-size:11px;margin-top:7px}@page{size:A4 landscape;margin:8mm}@media print{body{margin:0;background:white}body>header,article nav{display:none}main{display:block}article{border:0;border-radius:0;padding:0;break-after:page}article:last-child{break-after:auto}.layout{grid-template-columns:minmax(0,1fr) 42mm}svg{max-height:163mm}table{font-size:8pt}h2{font-size:12pt}footer{font-size:7pt}}@media screen and (max-width:850px){main{grid-template-columns:1fr}}</style><header><h1>187 деталей · 16 листов</h1><p>Площадь деталей 74,519 м². Лист 2750×1830, пропил 5, обрезка 10 мм. Все размеры и количества сохранены.</p><button onclick="document.querySelector(\'main\').style.gridTemplateColumns=\'1fr\'">Один в ряд</button><button onclick="document.querySelector(\'main\').style.gridTemplateColumns=\'repeat(2,minmax(0,1fr))\'">По 2 в ряд</button><button onclick="document.querySelector(\'main\').style.gridTemplateColumns=\'repeat(3,minmax(0,1fr))\'">По 3 в ряд</button><button onclick="print()">Печать</button><a href="sequence.html">Все операции</a></header><main>'+articles.join('')+'</main></html>');
const columns=['step','type','cutIndex','inputBlankId','outputBlankIds','seriesId','w','h','machineOrientation','fromOrientation','toOrientation','axis','startX','startY','endX','endY','materialAxis','materialPos','stage'];
const records=r.plan.operations.map(o=>({...o,outputBlankIds:(o.outputBlankIds||[]).join('|'),startX:o.start?.x,startY:o.start?.y,endX:o.end?.x,endY:o.end?.y}));
const quote=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
put('operations.csv','\ufeff'+columns.join(';')+'\n'+records.map(o=>columns.map(k=>quote(o[k])).join(';')).join('\n')+'\n');
put('primary-strips.json',JSON.stringify(r.plan.primaryStrips,null,2));put('sheet-summary.json',JSON.stringify(summaries,null,2));put('verification.json',JSON.stringify(verification,null,2));
const json=JSON.stringify(r).replace(/</g,'\\u003c');
const browser=function(){
 const r=JSON.parse(document.getElementById('data').textContent),slider=document.getElementById('step'),svg=document.getElementById('frame'),ns='http://www.w3.org/2000/svg';
 function tag(name,attrs,text){const e=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.appendChild(e);}
 function box(a,b,q){const x=a.x-b.x,y=a.y-b.y;return q===0?{x,y,w:a.w,h:a.h}:q===1?{x:b.h-y-a.h,y:x,w:a.h,h:a.w}:q===2?{x:b.w-x-a.w,y:b.h-y-a.h,w:a.w,h:a.h}:{x:y,y:b.w-x-a.w,w:a.h,h:a.w};}
 function draw(){const index=+slider.value,o=r.plan.operations[index],a=o.materialRect||{x:0,y:0,w:r.parameters.sheetW,h:r.parameters.sheetH},q=(o.type==='rotate'?o.fromOrientation:o.machineOrientation||0)/90,W=q%2?a.h:a.w,H=q%2?a.w:a.h;let si=0;for(let i=0;i<=index;i++)if(r.plan.operations[i].type==='load')si=r.plan.operations[i].sheet;
  svg.replaceChildren();svg.setAttribute('viewBox',[-20,-20,W+40,H+40].join(' '));tag('rect',{x:0,y:0,width:W,height:H,fill:'#eef2f6',stroke:'#334155'});
  for(const p of r.sheets[si].parts){if(p.x<a.x||p.y<a.y||p.x+p.w>a.x+a.w||p.y+p.h>a.y+a.h)continue;const b=box(p,a,q);tag('rect',{x:b.x,y:b.y,width:b.w,height:b.h,fill:'#bedcf8',stroke:'#64748b'});tag('text',{x:b.x+b.w/2,y:b.y+b.h/2,'text-anchor':'middle','font-size':Math.min(32,b.h*.4)},p.id);}
  if(o.type==='cut'){
   for(const child of r.verification.roleFrames.find(f=>f.step===o.step).outputs){const b=box(child.rect,a,q);tag('rect',{x:b.x,y:b.y,width:b.w,height:b.h,fill:'none',stroke:child.held?'#c53030':'#16834b','stroke-width':3});}
   tag('line',{x1:o.start.x,y1:o.start.y,x2:o.end.x,y2:o.end.y,stroke:'#d22','stroke-width':o.kerf});
  }
  if(o.type==='rotate')tag('text',{x:W/2,y:H/2,'text-anchor':'middle','font-size':Math.min(W,H)/8,fill:'#b42318'},'↻ 90°');
  document.getElementById('caption').textContent='Шаг '+o.step+' / '+r.plan.operations.length+' · Лист '+(si+1)+' · '+o.type+(o.cutIndex?' №'+o.cutIndex:'')+' · '+W+'×'+H+' мм · ориентация '+q*90+'°';
  document.getElementById('info').textContent=JSON.stringify(o,null,2);
 }
 slider.oninput=draw;document.getElementById('prev').onclick=()=>{slider.value=Math.max(0,+slider.value-1);draw();};document.getElementById('next').onclick=()=>{slider.value=Math.min(+slider.max,+slider.value+1);draw();};draw();
};
put('sequence.html','<!doctype html><html lang="ru"><meta charset="utf-8"><title>187 деталей · последовательность распила</title><style>body{font:15px Arial;margin:20px}nav{display:flex;gap:12px}input{flex:1}svg{width:100%;height:65vh}pre{white-space:pre-wrap}</style><h1>16 листов · последовательность обработки</h1><p>Показана текущая физическая заготовка перед операцией. Красная линия — CUT; зелёный контур — отделённая часть, красный — удерживаемая. На ROTATE показано исходное положение. Координаты локальные машинные. Параметры конкретного станка не подтверждены.</p><nav><button id="prev">Назад</button><input id="step" type="range" min="0" max="'+(r.plan.operations.length-1)+'" value="0"><button id="next">Далее</button></nav><h2 id="caption"></h2><svg id="frame"></svg><pre id="info"></pre><script type="application/json" id="data">'+json+'</script><script>('+browser.toString()+')();</script></html>');
console.log(JSON.stringify({out,metrics:r.metrics,sheets:summaries.length}));
