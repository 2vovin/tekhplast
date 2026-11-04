'use strict';
const fs=require('node:fs'),path=require('node:path');
const {verify,arrange}=require('../web/engine.cjs'),{svg}=require('../src/held-strip-artifacts');
const examples=require('../web/examples.json'),dir=path.resolve(__dirname,'../benchmarks/ordered-strips');fs.mkdirSync(dir,{recursive:true});
const comparison=[];
for(const key of ['26','44','171']){
 const e=examples[key],before=verify(e.parameters,e.layout),started=performance.now(),after=arrange(before),elapsedMs=performance.now()-started;
 comparison.push({order:key,before:before.metrics,after:after.metrics,ordering:after.ordering,elapsedMs});
 if(key==='26'){
  fs.writeFileSync(path.join(dir,'result-26.json'),JSON.stringify(after,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'sheet-26.svg'),svg({x:0,y:0,w:after.parameters.sheetW,h:after.parameters.sheetH},after.sheets[0].parts,'Крупные сначала · 26 деталей · 43 реза · станок не подтверждён'));
  const rows=after.plan.operations.map(o=>'|'+[o.step,o.type,o.inputBlankId||o.blankId||'',(o.outputBlankIds||[]).join(', '),o.w?o.w+'×'+o.h:'',o.machineOrientation??o.toOrientation??'',o.axis||'',o.start?(o.axis==='V'?o.start.x:o.start.y):''].join('|')+'|').join('\n');
  fs.writeFileSync(path.join(dir,'operations-26.md'),'# Крупные сначала: физические операции\n\nКоординаты локальные машинные. Удерживаемые остатки не поворачиваются.\n\n|Шаг|Операция|Вход|Выходы|Размер|Ориентация|Ось|Позиция|\n|---:|---|---|---|---|---:|---|---:|\n'+rows+'\n');
 }
}
fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');
console.log(comparison.map(c=>({order:c.order,sheets:c.after.sheets,cuts:c.after.cuts,turns:c.after.turns,exceptions:c.ordering.exceptions.length,elapsedMs:c.elapsedMs})));
