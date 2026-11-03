'use strict';
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const txt=x=>String(x).replace(/\|/g,'&#124;').replace(/\n/g,' ');
function mapSVG(result,primaryOnly=false){
 const p=result.parameters,W=p.sheetW,H=p.sheetH,gap=110;
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 -80 '+(W+50)+' '+(result.sheets.length*(H+gap)+80)+'" role="img" aria-label="PSS '+esc(result.version??'1.2')+': все листы и первичные полосы"><text x="0" y="-35" font-size="32">PSS '+esc(result.version??'1.2')+' — '+(primaryOnly?'первичный распуск с сохранением основного остатка':result.partCount+' деталей: технологически проверенный раскрой')+'</text>';
 const owners=new Map(result.verification.blanks.map(b=>[b.blankId,b.sheet]));
 result.sheets.forEach((sh,si)=>{
  const offset=si*(H+gap),count=sh.parts.length;
  svg+='<g transform="translate(0 '+offset+')"><rect width="'+W+'" height="'+H+'" fill="#e2e8f0" stroke="#111" stroke-width="3"/>';
  if(sh.primaryRemainder){const r=sh.primaryRemainder.rect;svg+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="#cbd5e1" stroke="#475569" stroke-width="3"/>';}
  if(!primaryOnly){
   for(const r of sh.remnants)svg+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="#f8fafc" stroke="#94a3b8"/>';
   for(const a of sh.parts){const color=String(a.id).split('').reduce((h,c)=>(h*31+c.charCodeAt(0))%360,0);
    svg+='<rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="hsl('+color+' 62% 78%)" stroke="#334155" stroke-width="2"/><text x="'+(a.x+8)+'" y="'+(a.y+29)+'" font-size="23">'+esc(a.id)+':'+a.instance+'</text><text x="'+(a.x+8)+'" y="'+(a.y+54)+'" font-size="18">'+a.w+'×'+a.h+'</text>';
   }
  }
  for(const a of sh.primaryStrips){
   const r=a.rect;svg+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="'+(primaryOnly?'#dbeafe':'none')+'" stroke="#1d4ed8" stroke-width="5" stroke-dasharray="16 8"/>';
   if(primaryOnly){const anchor=sh.parts.find(b=>b.id===a.anchor.id&&b.instance===a.anchor.instance);svg+='<rect x="'+anchor.x+'" y="'+anchor.y+'" width="'+anchor.w+'" height="'+anchor.h+'" fill="#fee2e2" stroke="#b91c1c" stroke-width="4"/><text x="'+(r.x+15)+'" y="'+(r.y+35)+'" font-size="25">П'+a.index+'; '+sh.axis+'; якорь '+esc(a.anchor.id)+':'+a.anchor.instance+'; ширина '+(sh.axis==='H'?r.h:r.w)+'</text>';}
  }
  if(primaryOnly)for(const op of result.plan.operations.filter(op=>op.type==='cut'&&op.phase.startsWith('PRIMARY')&&owners.get(op.inputBlankId)===si)){
   const r=op.materialRect,v=op.materialAxis==='V',pos=op.materialPos;
   svg+='<line x1="'+(v?pos:r.x)+'" y1="'+(v?r.y:pos)+'" x2="'+(v?pos:r.x+r.w)+'" y2="'+(v?r.y+r.h:pos)+'" stroke="#dc2626" stroke-width="3"/><text x="'+(v?pos+8:r.x+W*0.7)+'" y="'+(v?r.y+50:pos-7)+'" font-size="20">CUT '+op.cutIndex+'</text>';
  }
  svg+='<text x="0" y="'+(H+40)+'" font-size="26">Лист '+(si+1)+': '+count+' деталей; серое — основной остаток, не поворачивается. Ось распуска '+sh.axis+'.</text></g>';
 });
 return svg+'</svg>\n';
}
function stripSVG(result,si,strip){
 const sh=result.sheets[si],r=strip.rect,p=result.parameters;
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -60 '+(r.w+20)+' '+(r.h+100)+'" role="img"><text x="0" y="-20" font-size="24">Лист '+(si+1)+', полоса '+strip.index+'; якорь '+esc(strip.anchor.id)+':'+strip.anchor.instance+'; '+r.w+'×'+r.h+'</text><rect width="'+r.w+'" height="'+r.h+'" fill="#f1f5f9" stroke="#1d4ed8" stroke-width="3"/>';
 for(const a of sh.parts.filter(a=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h)){
  const anchor=a.id===strip.anchor.id&&a.instance===strip.anchor.instance;
  svg+='<rect x="'+(a.x-r.x)+'" y="'+(a.y-r.y)+'" width="'+a.w+'" height="'+a.h+'" fill="'+(anchor?'#fee2e2':'#dcfce7')+'" stroke="#334155" stroke-width="2"/><text x="'+(a.x-r.x+8)+'" y="'+(a.y-r.y+26)+'" font-size="20">'+esc(a.id)+':'+a.instance+' '+a.w+'×'+a.h+'</text>';
 }
 let node=sh.tree;for(const bit of strip.path.split('/').slice(1))node=bit==='0'?node.first:node.second;
 const cutByGeometry=new Map(result.plan.operations.filter(op=>op.phase==='WORKING_CUT').map(op=>[op.geometryCutNumber,op.cutIndex]));
 function walk(n){if(n.kind!=='cut')return;const v=n.axis==='V';
  svg+='<line x1="'+(v?n.pos-r.x:n.rect.x-r.x)+'" y1="'+(v?n.rect.y-r.y:n.pos-r.y)+'" x2="'+(v?n.pos-r.x:n.rect.x+n.rect.w-r.x)+'" y2="'+(v?n.rect.y+n.rect.h-r.y:n.pos-r.y)+'" stroke="#475569" stroke-width="1.5" stroke-dasharray="8 4"/>'+
   '<text x="'+(v?n.pos-r.x+3:n.rect.x-r.x+8)+'" y="'+(v?n.rect.y-r.y+15:n.pos-r.y-3)+'" font-size="12">C'+cutByGeometry.get(n.number)+'</text>';walk(n.first);walk(n.second);
 }walk(node);return svg+'</svg>\n';
}
function treeSVG(result){
 const list=result.verification.blanks,nodes=new Map(list.map((b,i)=>[b.blankId,{...b,label:'B'+String(i+1).padStart(3,'0'),children:[]}]));
 const cuts=new Map(result.plan.operations.filter(a=>a.type==='cut').map(a=>[a.inputBlankId,a.cutIndex])),roots=[];
 for(const b of nodes.values()){if(b.parentBlankId)nodes.get(b.parentBlankId).children.push(b);else roots.push(b);}
 let leaf=0,depthMax=0;
 function place(b,d){depthMax=Math.max(depthMax,d);b.x=15+d*245;b.children.forEach(a=>place(a,d+1));b.y=b.children.length?b.children.reduce((n,a)=>n+a.y,0)/b.children.length:130+leaf++*72;}
 roots.forEach(b=>place(b,0));
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+((depthMax+1)*245+30)+' '+(leaf*72+200)+'"><rect width="100%" height="100%" fill="white"/><text x="15" y="35" font-size="25">PSS: все '+list.length+' заготовок и независимо проверенные роли</text><text x="15" y="75" font-size="18">MAIN не поворачивается; STRIP/SUB имеют своё право 0/1 поворота. На рёбрах CUT №.</text>';
 for(const b of nodes.values())for(const a of b.children)svg+='<path d="M '+(b.x+215)+' '+b.y+' L '+(a.x-5)+' '+a.y+'" stroke="#94a3b8" fill="none"/><text x="'+(b.x+216)+'" y="'+((b.y+a.y)/2-5)+'" font-size="11">'+cuts.get(b.blankId)+'</text>';
 const short={PRIMARY_PANEL:'PANEL',PRIMARY_REMAINDER:'MAIN',DETACHED_PRIMARY_STRIP:'STRIP',SECONDARY_BLANK:'SUB',WASTE:'TRIM'};
 for(const b of nodes.values()){const r=b.materialRect,fill=b.role==='PRIMARY_REMAINDER'?'#cbd5e1':b.role==='DETACHED_PRIMARY_STRIP'?'#bfdbfe':'#f1f5f9';
  svg+='<rect x="'+b.x+'" y="'+(b.y-29)+'" width="215" height="60" rx="4" fill="'+fill+'" stroke="#475569"/><text x="'+(b.x+6)+'" y="'+(b.y-11)+'" font-size="13">'+b.label+' '+(short[b.role]??b.role)+' '+r.w+'×'+r.h+'</text><text x="'+(b.x+6)+'" y="'+(b.y+12)+'" font-size="12">'+b.initialMachineOrientation+'°→'+b.machineOrientation+'°; turns='+b.turnCount+'</text><title>'+esc(b.blankId)+'</title>';
 }return svg+'</svg>\n';
}
function renderPSS(result,options={}){
 const out={'manual-26-pss-map.svg':mapSVG(result),'manual-26-pss-primary.svg':mapSVG(result,true),'manual-26-pss-blanks.svg':treeSVG(result)};
 const tags=new Map(result.verification.blanks.map((b,i)=>[b.blankId,'B'+String(i+1).padStart(3,'0')]));
 let doc='# Brain '+txt(result.version??'1.2')+' — PANEL_SAW_STAGED (PSS)\n\n'+(result.sheets.length===1?'**Найден допустимый PSS-план на одном листе.** ':'**На одном листе допустимый PSS-план не найден.** ')+'Все '+result.partCount+' деталей размещены на '+result.sheets.length+' листах. Это не доказательство минимальности.\n\n'+
 '![Общая карта](../benchmarks/manual-26-pss-map.svg)\n\n'+
 '![Первичные полосы](../benchmarks/manual-26-pss-primary.svg)\n\n'+
 '[Дерево всех заготовок](../benchmarks/manual-26-pss-blanks.svg) · [JSON](../benchmarks/manual-26-pss.json)\n\n'+
 'Режим PANEL_SAW_STAGED, профиль '+txt(result.equipmentProfile.id)+'. Геометрия, физическая последовательность и роли/якоря проверены независимо. Профиль абстрактный, применимость к реальному станку и БАЗИС не подтверждена.\n\n'+
 'Если выбранная ось этого требует, выполняется разрешённый предварительный поворот сырого листа; затем вся серия параллельных резов по основному остатку. Рабочие полосы снимаются с высокой стороны поперечной координаты; низкая часть остаётся PRIMARY_REMAINDER. endPrimary роли не меняет. Ширина каждой рабочей полосы равна одному реальному ведущему экземпляру; припуск 0. После каждого CUT новые дети имеют turnCount=0.\n\n'+
 '## Первичные полосы и якоря\n\n| Лист | Полоса | Ось материала | Ширина | Якорь | Blank | Конверсия последнего остатка |\n|---:|---:|---|---:|---|---|---|\n';
 result.sheets.forEach((sh,si)=>sh.primaryStrips.forEach(a=>{
  const decl=result.plan.primaryStrips.find(d=>d.sheet===si&&d.stripIndex===a.index);
  doc+='| '+(si+1)+' | '+a.index+' | '+sh.axis+' | '+(sh.axis==='H'?a.rect.h:a.rect.w)+' | '+txt(a.anchor.id)+':'+a.anchor.instance+' | '+tags.get(decl.blankId)+' | '+(a.finalRemainder?'явная FINAL_REMAINDER_AS_STRIP':'нет, физически отделена CUT')+' |\n';
 }));
 doc+='\n## Последующий раскрой каждой полосы\n\n';
 result.sheets.forEach((sh,si)=>sh.primaryStrips.forEach(a=>{
  const name='manual-26-pss-strip-'+(si+1)+'-'+a.index+'.svg';out[name]=stripSVG(result,si,a);doc+='Лист '+(si+1)+', полоса '+a.index+': реальный якорь '+txt(a.anchor.id)+':'+a.anchor.instance+' первым; остальные детали находятся за ним по длине.\n\n![Полоса](../benchmarks/'+name+')\n\n';
 }));
 doc+='## Все операции\n\nМашинные координаты локальные для поданной заготовки, V=x const. Материальные координаты неизменны. Поворот исходного листа, если он нужен, выполняется только до первого реза. CUT №, шаги и номера деталей независимы.\n\n'+
 '| Шаг | Действие | CUT № | Вход | Роль | Размер / ориентация | Машинный рез | Выходы |\n|---:|---|---:|---|---|---|---|---|\n';
 for(const op of result.plan.operations){let coords='—',orientation=op.machineOrientation??'—';
  if(op.type==='rotate'){coords='90°; 0→1';orientation=op.fromOrientation+'→'+op.toOrientation;}
  if(op.type==='cut')coords=op.axis+': ('+op.start.x+','+op.start.y+')→('+op.end.x+','+op.end.y+')';
  const trace=result.verification.trace.find(a=>a.step===op.step),input=op.inputBlankId??op.blankId;
  doc+='| '+op.step+' | '+(op.type==='rotate'?'ROTATE_90':op.type==='cut'?'CUT':op.type)+' | '+(op.cutIndex??'—')+' | '+(tags.get(input)??'лист '+(op.sheet+1))+' | '+(trace?.role??'—')+' | '+(op.w==null?'—':op.w+'×'+op.h)+' / '+orientation+'° | '+coords+' | '+(op.outputBlankIds??op.stripBlankIds??[]).map(id=>tags.get(id)).join(', ')+' |\n';
 }
 doc+='\n## Роли и родословная всех заготовок\n\n| B | Родитель | blankId | Материал X,Y,W,H | Роль при создании → итог | Машинная ориентация | turnCount |\n|---|---|---|---|---|---|---:|\n';
 for(const b of result.verification.blanks){const r=b.materialRect;doc+='| '+tags.get(b.blankId)+' | '+(tags.get(b.parentBlankId)??'—')+' | '+txt(b.blankId)+' | '+[r.x,r.y,r.w,r.h].join(', ')+' | '+b.roleAtCreation+' → '+b.role+' | '+b.initialMachineOrientation+'→'+b.machineOrientation+'° | '+b.turnCount+' |\n';}
 doc+='\n## Метрики\n\n'+result.metrics.cuts+' рез, '+result.metrics.cutLength+' мм, '+result.metrics.turns+' поворотов (включая предварительные повороты листов), '+result.metrics.operations+' операций. Включены реальные обрезки кромок; необработанный основной остаток не торцуется и не разворачивается. Полные размеры деталей, отдельные отходы, профили и replay находятся в JSON.\n';
 const prefix=options.prefix??'manual-26-pss';
 const graphics=Object.fromEntries(Object.entries(out).map(([name,svg])=>[name.replaceAll('manual-26-pss',prefix),svg]));
 return {graphics,markdown:doc.replaceAll('manual-26-pss',prefix)};
}
module.exports={renderPSS,mapSVG,stripSVG,treeSVG};
