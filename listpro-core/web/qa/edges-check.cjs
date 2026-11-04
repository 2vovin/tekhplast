const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.LISTPRO_BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>document.getElementById('statParts').textContent==='44');
 await page.locator('[data-tab="parts"]').click();const row=page.locator('#partsBody [data-row="0"]');
 assert.equal(await row.locator('[data-edge]').count(),4);assert.equal(await row.locator('select,details,.edge-cycle').count(),0);
 for(const axis of ['l','w']){const cell=row.locator('[data-field="'+axis+'"]').locator('..');assert.equal(await cell.locator('[data-edge]').count(),2);const d=await cell.locator('input[type="number"]').boundingBox(),c=await cell.locator('[data-edge]').first().boundingBox();assert(c.x>=d.x+d.width);}
 const count=async(axis,n)=>assert.match(await row.locator('[data-field="'+axis+'"]').getAttribute('class'),new RegExp('edge-count-'+n));
 // Either checkbox alone means one line; they control distinct physical sides.
 await row.locator('[data-edge="bottom"]').check();await count('l',1);assert.equal(await page.locator('#drawing .edge-band').count(),28);
 await row.locator('[data-edge="top"]').check();await count('l',2);await row.locator('[data-edge="bottom"]').uncheck();await count('l',1);await row.locator('[data-edge="top"]').uncheck();await count('l',0);
 await row.locator('[data-edge="top"]').check();await row.locator('[data-edge="bottom"]').check();await row.locator('[data-edge="left"]').check();await count('w',1);
 assert.equal(await page.locator('#statCuts').textContent(),'60 / 7');assert.equal(await page.locator('#drawing .edge-band').count(),84);
 assert.deepEqual(await page.locator('#sheetPartsBody .edge-size').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).textDecorationStyle)),['double','solid']);assert.equal(await page.locator('.edge-summary').count(),0);
 const marks=await page.locator('#drawing .piece').evaluateAll(gs=>gs.map(g=>({w:Number(g.querySelector('rect').getAttribute('width')),edges:[...g.querySelectorAll('.edge-band')].map(e=>[e.dataset.edgeSource,e.dataset.edgeSide])})));
 for(const m of marks)assert.deepEqual(m.edges,m.w===500?[['top','top'],['bottom','bottom'],['left','left']]:[['top','right'],['bottom','left'],['left','top']]);
 await page.locator('#panel-parts .table-scroll').screenshot({path:path.join(__dirname,'checkbox-edge-selection.png')});
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});assert.equal(await page.locator('.print-page').count(),2);assert.doesNotMatch(await page.locator('#printPages').innerText(),/Верх|Право|Лево|Толщина/);await page.pdf({path:path.join(__dirname,'print-checkbox-edges.pdf'),preferCSSPageSize:true});await page.emulateMedia({media:'screen'});
 const save=page.waitForEvent('download');await page.locator('#save').click();const d=await save,project=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.deepEqual(project.project.pieces[0].edges,{top:1,right:0,bottom:1,left:1});
 // Legacy projects preserve their selected sides; no thickness is exposed in the UI.
 project.project.pieces[0].edges={top:.4,right:.8,bottom:0,left:2};
 await page.locator('#importOpen').click();await page.locator('#fileInput').setInputFiles({name:'legacy-edges.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(()=>document.getElementById('importModal').hidden);
 for(const [side,on]of Object.entries({top:true,right:true,bottom:false,left:true}))assert.equal(await row.locator('[data-edge="'+side+'"]').isChecked(),on);
 await count('l',1);await count('w',2);await page.locator('#calculate').click();await page.waitForFunction(()=>!document.getElementById('calculate').disabled,{},{timeout:60000});assert.equal(await page.locator('#drawing .edge-band').count(),84);
 await page.locator('#export').click();const dl=page.waitForEvent('download');await page.locator('#downloadSvg').click();assert.match(fs.readFileSync(await (await dl).path(),'utf8'),/stroke-dasharray="0 5"/);await page.locator('[data-close="exportModal"]').click();
 await page.locator('[data-tab="parts"]').click();await row.locator('[data-field="l"]').fill('510');assert.equal(await page.locator('#print').isDisabled(),true);await count('l',1);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.deepEqual(errors,[]);await browser.close();console.log('Checkbox edges passed: 0/1/2 sides, exact placement, underlined dimensions, independent sides, map rotations, print, legacy JSON and SVG, dimension editing, mobile.');
})().catch(e=>{console.error(e);process.exit(1)});
