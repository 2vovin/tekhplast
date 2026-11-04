'use strict';
const assert=require('node:assert/strict');
async function run(win){
 const js=code=>win.webContents.executeJavaScript(code);
 async function until(code){const end=Date.now()+120000;while(Date.now()<end){if(await js(code))return;await new Promise(r=>setTimeout(r,200));}throw Error('Timeout '+code+' / '+await js("document.getElementById('validation').textContent"));}
 await until("document.getElementById('partsBody')!==null");
 assert.equal(await js("document.querySelectorAll('#partsBody tr').length"),0);
 assert.equal(await js("document.querySelectorAll('[data-example]').length"),0);
 await js("document.getElementById('addRow').click()");
 assert.equal(await js("document.querySelector('#partsBody [data-field=l]').value"),'');
 assert.equal(await js("document.querySelector('#partsBody [data-field=w]').value"),'');
 await js("document.querySelector('[data-tab=settings]').click();const set=(id,v)=>{const x=document.getElementById(id);x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));};set('sheetW',1200);set('sheetH',900);set('materialName','Стекло');set('materialThickness',4);set('trim',10);set('kerf',5)");
 await js("document.getElementById('importOpen').click();document.getElementById('importText').value='1100;800;3';document.getElementById('applyImport').click();document.getElementById('calculate').click()");
 await until("document.getElementById('statParts').textContent==='3'&&!document.getElementById('calculate').disabled");
 assert.equal(await js("document.getElementById('statSheets').textContent"),'3');
 assert.equal(await js("document.querySelectorAll('.sheet-card').length"),3);
 assert.equal(await js("document.querySelectorAll('.sheet-card')[2].querySelectorAll('svg text,svg title,[data-part]').length"),0);
 assert.equal(await js("document.querySelectorAll('.sheet-card')[2].querySelectorAll('.demo-blurred rect').length"),1);
 assert.equal(await js("document.querySelectorAll('.sheet-card')[0].querySelectorAll('.part-number').length"),1);
 await js("document.querySelector('[data-open-sheet=\"2\"]').click()");
 assert.equal(await js("document.querySelectorAll('#drawing [data-part],#drawing svg text').length"),0);
 assert.match(await js("document.getElementById('sheetPartsBody').textContent"),/скрыты/);
 assert.equal(await js("document.getElementById('print').disabled&&document.getElementById('export').disabled&&document.getElementById('save').disabled"),true);
 await js("window.print();window.dispatchEvent(new Event('beforeprint'))");
 assert.equal(await js("document.querySelectorAll('#printPages svg').length"),0);
 assert.match(await js("document.getElementById('printPages').textContent"),/недоступна/);
 assert.match(await js("document.getElementById('materialBadge').textContent"),/Стекло.*4/);
 assert.match(await js("document.getElementById('sizeBadge').textContent"),/1\s?200 × 900/);
 await js("document.getElementById('calculate').click()");
 await until("!document.getElementById('calculate').disabled&&document.getElementById('orderHint').textContent.includes('Использован накопленный опыт')");
 assert.match(await js("document.getElementById('orderHint').textContent"),/расчёты: 2/);
 return {experienceSavedAndReused:true,emptyStart:true,blankNewRow:true,presetCount:0,customSheet:'1200x900',material:'Стекло',thickness:4,sheets:3,visibleSheets:2,thirdSheetRedacted:true,printBlocked:true,exportBlocked:true};
}
module.exports={run};
