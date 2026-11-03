'use strict';
const fs=require('node:fs'),path=require('node:path');
const {fromDiagram,buildRawLayout}=require('../src/deferred-strip-patterns');
const {verifyDeferred,optimizeDeferred}=require('../src/deferred-strip-search');
const {verify}=require('../web/engine.cjs');
const {svg}=require('../src/held-strip-artifacts');
const examples=require('../web/examples.json'),reference=require('../benchmarks/order-171-manual-10/reference.json');
const dir=path.resolve(__dirname,'../benchmarks/deferred-strips');fs.mkdirSync(dir,{recursive:true});
const p=examples['171'].parameters,raw=buildRawLayout(p,reference.sheets.map(sh=>fromDiagram(p,sh.topology)));
const old=verify(p,examples['171-legacy'].layout),t=optimizeDeferred(p,[old,raw]),s=t.best;
const write=(name,data)=>fs.writeFileSync(path.join(dir,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
write('result.json',s);write('verification.json',s.verification);
const comparison={parameters:{sheetW:p.sheetW,sheetH:p.sheetH,kerf:p.kerf,trim:p.trim},previous:old.metrics,current:s.metrics,search:t.stats,provenance:'Manual PDF topology warm start; dimensions taken exclusively from the original order. Not an unseeded discovery.',originalArea:p.pieces.reduce((n,a)=>n+a.l*a.w*a.q,0)};
comparison.areaLowerBound=Math.ceil(comparison.originalArea/((p.sheetW-2*p.trim)*(p.sheetH-2*p.trim)));write('comparison.json',comparison);
const inside=(a,r)=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h;
for(const [i,sh]of s.sheets.entries()){
 write('sheet-'+(i+1)+'.svg',svg({x:0,y:0,w:p.sheetW,h:p.sheetH},sh.parts,'Лист '+(i+1)+' · '+sh.parts.length+' деталей · станок не подтверждён'));
 const strips=s.plan.primaryStrips.filter(b=>b.sheet===i);
 const lines=strips.map(b=>'<rect x="'+b.materialRect.x+'" y="'+b.materialRect.y+'" width="'+b.materialRect.w+'" height="'+b.materialRect.h+'" fill="none" stroke="#ef4444" stroke-width="5"/><text x="'+(b.materialRect.x+20)+'" y="'+(b.materialRect.y+45)+'" font-size="30">'+b.stripIndex+' · '+b.nominalSpan+' мм</text>').join('');
 write('primary-'+(i+1)+'.svg',svg({x:0,y:0,w:p.sheetW,h:p.sheetH},[],'Первичные полосы · '+sh.axis,lines));
 for(const b of strips)write('strip-'+(i+1)+'-'+b.stripIndex+'.svg',svg(b.materialRect,sh.parts.filter(a=>inside(a,b.materialRect)),'Полоса '+b.stripIndex));
}
write('operations.md','# Операции нового варианта на 10 листах\n\nКоординаты локальные машинные; ось подачи фиксируется при загрузке каждого листа. Удерживаемые остатки не вынимаются и не поворачиваются. edgeFinish — конечная торцовка, диск частично проходит вне детали, выход не может снова обрабатываться.\n\n|Шаг|Операция|Вход|Выходы|Размер в станке|Ориентация|Ось|Позиция|Торцовка края|\n|---:|---|---|---|---|---:|---|---:|---|\n'+s.plan.operations.map(o=>'|'+[o.step,o.type,o.inputBlankId||o.blankId||'',(o.outputBlankIds||o.stripBlankIds||[]).join(', '),o.w?o.w+'×'+o.h:'',o.machineOrientation??o.toOrientation??'',o.axis||'',o.start?(o.axis==='V'?o.start.x:o.start.y):'',o.edgeFinish?'да':''].join('|')+'|').join('\n')+'\n');
console.log(JSON.stringify(comparison,null,2));
