const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 await page.goto(process.env.LISTPRO_BASE_URL||'http://127.0.0.1:4173');
 await page.waitForFunction(()=>document.getElementById('statParts').textContent==='44');
 await page.locator('[data-tab="parts"]').click();await page.locator('#panel-parts [data-example="26"]').click();await page.waitForFunction(()=>document.getElementById('statParts').textContent==='26');
 // Exercise browser print (Ctrl+P), independently of the application button.
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.print-page').count(),1);
 assert.equal(await page.locator('.print-page tbody tr').count(),10);
 assert.equal(await page.locator('.print-page tbody tr').evaluateAll(rows=>rows.reduce((n,r)=>n+Number(r.lastElementChild.textContent),0)),26);
 await page.pdf({path:path.join(__dirname,'print-26.pdf'),preferCSSPageSize:true});
 await page.emulateMedia({media:'screen'});
 await page.locator('#importOpen').click();await page.locator('#importText').fill(Array.from({length:35},(_,i)=>`${100+i};100;1`).join('\n'));await page.locator('#applyImport').click();await page.locator('#calculate').click();
 await page.waitForFunction(()=>document.getElementById('statParts').textContent==='35',{},{timeout:60000});assert.equal(await page.locator('#statSheets').textContent(),'1');
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.print-page').count(),2);
 assert.equal(await page.locator('.print-page svg').count(),2);
 const ids=await page.locator('.print-page tbody tr td:first-child').allTextContents();assert.equal(ids.length,35);assert.equal(new Set(ids).size,35);
 await page.pdf({path:path.join(__dirname,'print-long-list.pdf'),preferCSSPageSize:true});
 await browser.close();console.log('Print passed: 26 parts / 10 rows; 35 distinct positions preserved on two pages with repeated map.');
})().catch(e=>{console.error(e);process.exit(1)});
