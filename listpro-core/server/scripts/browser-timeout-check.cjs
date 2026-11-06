'use strict';
const {chromium}=require('playwright'),{createService}=require('../main.cjs'),{once}=require('node:events'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 require('./build.cjs').build();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-timeout-browser-')),pass='test-timeout-owner-password',salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');
 const service=createService({user:'owner',salt,hash,dataDir:dir,timeoutMs:15000});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000},httpCredentials:{username:'owner',password:pass}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+service.server.address().port);
  const input=require('../tests/fixtures/order-229.json');await page.locator('#importOpen').click();await page.locator('#importRotate').check();await page.locator('#importText').fill(input.pieces.map(p=>[p.l,p.w,p.q].join('\t')).join('\n'));await page.locator('#applyImport').click();assert.equal(await page.locator('#partsBody tr').count(),100);await page.locator('#calculate').click();
  await page.waitForFunction(()=>document.getElementById('serverNotice').textContent.includes('Оптимизация не завершена'),{},{timeout:60000});assert.equal(await page.locator('#statParts').textContent(),'229');assert((await page.locator('.sheet-card').count())>=15);assert(await page.locator('#serverNotice').isVisible());assert(await page.locator('#calculate').isEnabled());
  await page.waitForTimeout(5000);assert(await page.locator('#serverNotice').isVisible());
  // A proxy HTML error must also remain visible, rather than disappearing as a toast.
  await page.route('**/api/jobs',route=>route.fulfill({status:503,contentType:'text/html',body:'<h1>Service unavailable</h1>'}));await page.locator('#calculate').click();await page.waitForFunction(()=>document.getElementById('serverNotice').textContent.includes('HTTP 503'));assert(await page.locator('#serverNotice').isVisible());assert.equal(await page.locator('#partsBody tr').count(),100);assert.deepEqual(errors,[]);
  console.log('Browser passed: 229 parts, timeout returns all maps, persistent warning, proxy HTML failure remains visible, form preserved.');
 }finally{if(browser)await browser.close();await service.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
