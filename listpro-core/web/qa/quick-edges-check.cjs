const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.LISTPRO_BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>document.getElementById('statParts').textContent==='44');
 await page.locator('[data-tab="parts"]').click();const row=page.locator('#partsBody [data-row="0"]'),length=row.locator('[data-edge-axis="l"]'),width=row.locator('[data-edge-axis="w"]');
 assert.equal(await row.locator('.edge-advanced').getAttribute('open'),null);
 await length.click();assert.equal(await length.locator('.edge-size').getAttribute('data-edge-count'),'1');assert.match(await row.locator('[data-field="l"]').getAttribute('class'),/edge-count-1/);
 assert.equal(await page.locator('#sheetPartsBody .edge-size').first().getAttribute('data-edge-count'),'1');
 await row.locator('[data-edge-thickness]').selectOption('0.4');assert.equal(await page.locator('#drawing .edge-band').first().getAttribute('data-thickness'),'0.4');assert.equal(await length.locator('.edge-size').getAttribute('data-edge-count'),'1');
 await length.click();assert.equal(await length.locator('.edge-size').getAttribute('data-edge-count'),'2');await width.click();assert.equal(await width.locator('.edge-size').getAttribute('data-edge-count'),'1');
 assert.deepEqual(await page.locator('#sheetPartsBody .edge-size').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).textDecorationStyle)),['double','solid']);
 assert.equal(await page.locator('#statCuts').textContent(),'60 / 7');assert.equal(await page.locator('#drawing .edge-band').count(),84);
 await page.locator('#panel-parts .table-scroll').screenshot({path:path.join(__dirname,'quick-edge-selection.png')});
 // No underline was added to the map: it keeps the requested dotted sides.
 assert.equal(await page.locator('#drawing .edge-size').count(),0);assert.equal(await page.locator('#drawing .edge-band').first().getAttribute('stroke-dasharray'),'0 5');
 await length.click();assert.equal(await length.locator('.edge-size').getAttribute('data-edge-count'),'0');assert.equal(await width.locator('.edge-size').getAttribute('data-edge-count'),'1');
 await length.click();await length.click();
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});assert.equal(await page.locator('.print-page').count(),2);
 assert.deepEqual(await page.locator('.print-page').first().locator('.edge-size').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).textDecorationStyle)),['double','solid']);
 await page.pdf({path:path.join(__dirname,'print-underlines.pdf'),preferCSSPageSize:true});await page.emulateMedia({media:'screen'});
 await row.locator('.edge-advanced summary').click();await row.locator('[data-edge="top"]').selectOption('0');assert.equal(await length.locator('.edge-size').getAttribute('data-edge-count'),'1');assert.equal(await row.locator('[data-edge="bottom"]').inputValue(),'0.4');
 // The primary one-side choice is configurable; adding the second preserves it.
 await length.click();assert.equal(await row.locator('[data-edge="bottom"]').inputValue(),'0.4');assert.equal(await row.locator('[data-edge="top"]').inputValue(),'0.4');
 await row.locator('[data-field="l"]').fill('510');assert.equal(await length.locator('.edge-size').textContent(),'510');assert.equal(await page.locator('#print').isDisabled(),true);assert.deepEqual(errors,[]);await browser.close();console.log('Quick edge choice passed: 0/1/2 cycle, input/list/print underlines, independent axes, thickness-independent counts, retained detailed side choice, map dots unchanged.');
})().catch(e=>{console.error(e);process.exit(1)});
