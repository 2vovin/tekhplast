'use strict';
const xml=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cell=x=>String(x).replace(/\|/g,'&#124;').replace(/\n/g,' ');
function renderMap(result){
 const p=result.parameters,sh=result.sheets[0];
 if(!sh)return '<svg xmlns="http://www.w3.org/2000/svg"/>';
 const largest=sh.remnants.reduce((a,b)=>!a||b.area>a.area?b:a,null);
 let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 -140 '+(p.sheetW+50)+' '+(p.sheetH+220)+'" role="img" aria-label="Brain 1.1: первичные полосы и детали">'+
 '<rect width="'+p.sheetW+'" height="'+p.sheetH+'" fill="#e2e8f0" stroke="#111" stroke-width="3"/>'+
 '<text x="0" y="-95" font-size="34">ЛистПро Brain 1.1: '+result.partCount+' деталей, лист '+p.sheetW+'×'+p.sheetH+'</text>'+
 '<text x="0" y="-50" font-size="27">'+result.metrics.cuts+' реза; '+result.metrics.cutLength+' мм; '+result.metrics.turns+' поворотов отдельных заготовок</text>';
 for(const r of sh.remnants)out+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="#fff" stroke="#94a3b8"/>';
 for(const a of sh.parts){
  const hue=String(a.id).split('').reduce((n,c)=>(n*31+c.charCodeAt(0))%360,0);
  out+='<rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="hsl('+hue+' 58% 80%)" stroke="#334155" stroke-width="2"/>'+
   '<text x="'+(a.x+8)+'" y="'+(a.y+28)+'" font-size="23">'+xml(a.id)+':'+a.instance+'</text>'+
   '<text x="'+(a.x+8)+'" y="'+(a.y+52)+'" font-size="18">'+a.w+'×'+a.h+'</text>';
 }
 for(const strip of sh.primaryStrips)out+='<rect x="'+strip.rect.x+'" y="'+p.trim+'" width="'+strip.rect.w+'" height="'+strip.rect.h+'" fill="none" stroke="#1d4ed8" stroke-width="6" stroke-dasharray="18 8"/>';
 if(largest)out+='<rect x="'+largest.x+'" y="'+largest.y+'" width="'+largest.w+'" height="'+largest.h+'" fill="none" stroke="#059669" stroke-width="6"/>'+
  '<text x="'+(largest.x+10)+'" y="'+(largest.y+35)+'" font-size="24" fill="#047857">'+largest.w+'×'+largest.h+'</text>';
 out+='<text x="0" y="'+(p.sheetH+45)+'" font-size="25">Синие рамки: первичные полосы. Зелёная: крупнейший остаток. Координаты материала; не программа ЧПУ.</text></svg>\n';
 return out;
}
function renderBlankTree(result){
 const records=result.verification.blanks,byId=new Map(records.map((b,i)=>[b.blankId,{...b,tag:'B'+String(i+1).padStart(3,'0'),children:[]}]));
 const output=new Map(result.plan.outputs.map(a=>[a.blankId,a])),cut=new Map(result.plan.operations.filter(a=>a.type==='cut').map(a=>[a.inputBlankId,a.cutIndex]));
 const roots=[];
 for(const b of byId.values()){if(b.parentBlankId)byId.get(b.parentBlankId).children.push(b);else roots.push(b);}
 let leaves=0,maxDepth=0;
 function place(b,depth){
  maxDepth=Math.max(maxDepth,depth);b.x=20+depth*235;
  b.children.forEach(a=>place(a,depth+1));
  b.y=b.children.length?b.children.reduce((n,a)=>n+a.y,0)/b.children.length:120+leaves++*66;
 }
 roots.forEach(b=>place(b,0));
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+((maxDepth+1)*235+30)+' '+(leaves*66+180)+'" role="img" aria-label="Дерево всех физических заготовок">'+
 '<rect width="100%" height="100%" fill="white"/><text x="20" y="32" font-size="23">Brain 1.1 — все '+records.length+' заготовок: лист → полосы → подполосы → детали/остатки</text>'+
 '<text x="20" y="65" font-size="17">B-номер соответствует таблице. Размеры в материале; ориентация на станке и turnCount указаны отдельно. На рёбрах номер CUT.</text>';
 for(const b of byId.values())for(const a of b.children)svg+='<path d="M '+(b.x+205)+' '+b.y+' L '+(a.x-8)+' '+a.y+'" stroke="#94a3b8" fill="none"/>'+
  '<text x="'+(b.x+207)+'" y="'+((b.y+a.y)/2-5)+'" font-size="11">'+cut.get(b.blankId)+'</text>';
 for(const b of byId.values()){
  const o=output.get(b.blankId),fill=o?.kind==='part'?'#dcfce7':o?'#f1f5f9':'#dbeafe',r=b.materialRect;
  svg+='<g><rect x="'+b.x+'" y="'+(b.y-25)+'" width="205" height="54" rx="5" fill="'+fill+'" stroke="#475569"/>'+
   '<text x="'+(b.x+6)+'" y="'+(b.y-8)+'" font-size="14">'+b.tag+' '+r.w+'×'+r.h+(o?.kind==='part'?' дет. '+xml(o.part.id)+':'+o.part.instance:'')+'</text>'+
   '<text x="'+(b.x+6)+'" y="'+(b.y+12)+'" font-size="12">ур. '+b.level+'; '+b.initialMachineOrientation+'°→'+b.machineOrientation+'°; turnCount='+b.turnCount+'</text>'+
   '<title>'+xml(b.blankId)+'</title></g>';
 }
 return svg+'</svg>\n';
}
function renderOperations(result){
 const p=result.parameters,m=result.metrics,blanks=result.verification.blanks;
 const tags=new Map(blanks.map((a,i)=>[a.blankId,'B'+String(i+1).padStart(3,'0')]));
 let text='# Brain 1.1 — карта, полосы и все операции\n\n'+
 '![Карта](../benchmarks/manual-26-brain-1.1-map.svg)\n\n'+
 '[Полное дерево всех заготовок](../benchmarks/manual-26-brain-1.1-blanks.svg) · [JSON](../benchmarks/manual-26-brain-1.1.json)\n\n'+
 'Профиль '+cell(result.equipmentProfile.id)+': одна машинная ось V, собственное право одного поворота каждого blankId; исходный лист в этом плане не вращается. Геометрия, полосная последовательность и профиль независимо проверены. Применимость условная: реальный станок/БАЗИС/ЧПУ не сертифицирован.\n\n'+
 '## Первичные полосы\n\n| Лист | Полоса | Blank | X | Ширина | Длина до / после торцовки |\n|---:|---:|---|---:|---:|---|\n';
 for(const a of result.plan.primaryStrips)text+='| '+(a.sheet+1)+' | '+a.stripIndex+' | '+tags.get(a.blankId)+' | '+a.materialRect.x+' | '+a.materialRect.w+' | '+p.sheetH+' / '+(p.sheetH-2*p.trim)+' |\n';
 text+='\nСначала боковые поля и весь первичный V-распуск. Барьер endPrimary запрещает поперечные операции до завершения первичной серии. Затем каждая полоса отдельно подаётся, поворачивается и торцуется. Дети каждого CUT — новые заготовки с turnCount=0; ориентация материала и машинная ориентация наследуются.\n\n'+
 '## Метрики\n\n'+m.parts+' деталей; '+m.primaryStrips+' первичные полосы; '+m.substrips+' обрабатываемые подполосы; максимум '+m.stages+' уровней; '+m.turns+' поворотов; '+m.cuts+' физических реза; '+m.cutLength+' мм; '+m.operations+' операции. Включена обрезка 10 мм при керфе 5 мм. Площадь крупнейшего отдельного остатка '+m.largestWaste+' мм².\n\n'+
 '## Нумерованная последовательность\n\nКоординаты CUT локальные машинные: V=x const, (x,0)→(x,H). Керф идёт в положительном направлении. Подача feed устанавливает локальный (0,0), сохраняя координаты материала. У rotate координаты реза null. Номера шага, CUT и деталей независимы.\n\n'+
 '| Шаг | Тип | CUT № | Уровень | Вход | Размер / ориентация | Машинные координаты | Выходы |\n|---:|---|---:|---:|---|---|---|---|\n';
 for(const op of result.plan.operations){
  const input=op.inputBlankId??op.blankId,ids=op.outputBlankIds??op.stripBlankIds??[];
  let dimensions=op.w===undefined?'—':op.w+'×'+op.h,orientation=op.machineOrientation??'—',coords='—';
  if(op.type==='rotate'){orientation=op.fromOrientation+'→'+op.toOrientation;coords='90°, counter 0→1';}
  if(op.type==='cut')coords=op.axis+': ('+op.start.x+','+op.start.y+')→('+op.end.x+','+op.end.y+')';
  text+='| '+op.step+' | '+op.type+' | '+(op.cutIndex??'—')+' | '+op.stage+' | '+(input?tags.get(input):'лист '+(op.sheet+1))+' | '+dimensions+' / '+orientation+'° | '+coords+' | '+ids.map(a=>tags.get(a)).join(', ')+' |\n';
 }
 text+='\n## Все физические заготовки и их подполосы\n\nB-номера используются в схеме и таблице операций; полные blankId сохранены ниже. История каждого куска находится также в verification.blanks[].history JSON. Все initialTurnCount равны 0.\n\n'+
 '| B | Родитель | blankId | Уровень | Материал: X,Y,W,H | Машинная ориентация | turnCount | Шаги истории |\n|---|---|---|---:|---|---|---:|---|\n';
 for(const b of blanks){const r=b.materialRect;text+='| '+tags.get(b.blankId)+' | '+(tags.get(b.parentBlankId)??'—')+' | '+cell(b.blankId)+' | '+b.level+' | '+[r.x,r.y,r.w,r.h].join(', ')+' | '+b.initialMachineOrientation+'→'+b.machineOrientation+'° | '+b.turnCount+' | '+b.history.map(a=>a.step).join(', ')+' |\n';}
 text+='\n## Детали в материале\n\n| Лист | Деталь:экземпляр | X | Y | W | H | Поворот относительно текстуры |\n|---:|---|---:|---:|---:|---:|---|\n';
 result.sheets.forEach((sh,i)=>sh.parts.forEach(a=>{text+='| '+(i+1)+' | '+cell(a.id)+':'+a.instance+' | '+a.x+' | '+a.y+' | '+a.w+' | '+a.h+' | '+(a.rotated?'да':'нет')+' |\n';}));
 text+='\n## Цельные остатки рабочей области\n\n| Лист | X | Y | W | H | Площадь, мм² |\n|---:|---:|---:|---:|---:|---:|\n';
 result.sheets.forEach((sh,i)=>sh.remnants.filter(r=>r.w>0&&r.h>0).sort((a,b)=>b.area-a.area).forEach(r=>{text+='| '+(i+1)+' | '+r.x+' | '+r.y+' | '+r.w+' | '+r.h+' | '+r.area+' |\n';}));
 return text;
}
module.exports={renderMap,renderBlankTree,renderOperations};
