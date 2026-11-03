'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{build}=require('../web/build.cjs'),{harness}=require('./helpers/web-dom.cjs');
const built=build(),app=fs.readFileSync(require('node:path').join(__dirname,'../web/app.js'),'utf8');
const evaluate=(src,context)=>{if(!vm.isContext(context))vm.createContext(context);return vm.runInContext(src,context);};
function start(){const h=harness(built.html,app,built.worker,evaluate);h.flush();return h;}
test('web UI contract: verified initial map, full-width tabs, sheet and operation navigation',()=>{
 const h=start(),get=id=>h.ids.get(id);assert.equal(get('statCuts').textContent,'60 / 7');assert.match(get('validation').textContent,/PSS проверены/);assert.match(get('drawing').innerHTML,/<svg/);
 h.elements.find(e=>e.dataset.tab==='parts').click();assert.equal(get('panel-map').hidden,true);assert.equal(get('panel-parts').hidden,false);
 assert.equal(get('sheetGallery').hidden,false);assert.equal(get('sheetLabel').textContent,'Все листы · 2');get('viewSingle').click();
 get('nextSheet').click();assert.equal(get('sheetLabel').textContent,'Лист 2 из 2');
 get('nextOp').click();assert.match(get('opLabel').textContent,/Пропил/);assert.match(get('physicalDrawing').innerHTML,/<line/);
 get('opRange').value=15;get('opRange').oninput();assert.match(get('opDetails').innerHTML,/мм в станке/);assert.match(get('opDetails').innerHTML,/дальнейший распуск|один поворот/);
});
test('web UI contract: objective changes invalidate the old map and actual worker recalculates',()=>{
 const h=start(),get=id=>h.ids.get(id);get('objective').value='cuts';get('objective').onchange();assert.equal(get('print').disabled,true);assert.equal(get('statCuts').textContent,'—');
 get('calculate').click();assert.equal(get('calculate').disabled,true);h.flush();
 assert.equal(get('statCuts').textContent,'58 / 6');assert.equal(get('calculate').disabled,false);assert.equal(get('print').disabled,false);
 get('save').click();assert.deepEqual(h.downloads,['listpro-project.json']);
 get('print').click();assert.equal(h.context.printed,true);assert.match(get('printPages').innerHTML,/print-page/);
});
test('web UI contract: Excel fractions preserve the input and stop showing the previous verified layout',()=>{
 const h=start(),get=id=>h.ids.get(id);get('importText').value='278,5;228;3\n468;59;2';get('applyImport').click();
 assert.equal(get('importError').textContent,'');assert.match(get('orderCount').textContent,/5 деталей/);assert.match(get('partsBody').innerHTML,/278.5/);assert.equal(get('print').disabled,true);
 get('calculate').click();h.flush();assert.equal(get('statParts').textContent,5);assert.match(get('validation').textContent,/PSS проверены/);
});
test('web UI contract: invalid import keeps the previous project and cancel stops the worker',()=>{
 const h=start(),get=id=>h.ids.get(id);get('importText').value='500;300;1.5';get('applyImport').click();assert.match(get('importError').textContent,/целое/);assert.equal(get('statParts').textContent,44);
 get('calculate').click();get('cancel').click();h.flush();assert.equal(get('calculate').disabled,false);assert.equal(get('progress').hidden,true);assert.equal(get('statParts').textContent,44);
});
