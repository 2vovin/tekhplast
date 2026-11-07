'use strict';
const {chromium}=require('playwright'),{createService}=require('../main.cjs'),{once}=require('node:events'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 require('./build.cjs').build();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-live-preview-')),pass='temporary-preview-check-password',salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(pass,Buffer.from(salt,'hex'),64).toString('hex');
 const service=createService({user:'owner',salt,hash,dataDir:dir,timeoutMs:15000});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},httpCredentials:{username:'owner',password:pass}}),errors=[],polls=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{if(/\/api\/jobs\/[^/]+\?after=/.test(r.url()))try{const s=await r.json();polls.push({at:Date.now(),status:s.status,revision:s.revision,hasMap:!!s.result,timing:s.timing});}catch{}});
  await page.goto('http://127.0.0.1:'+service.server.address().port);
  const input=require('../../benchmarks/order-127-target16/input.json');
  await page.locator('#importOpen').click();await page.locator('#importRotate').check();
  await page.locator('#importText').fill(input.pieces.map(p=>[p.l,p.w,p.q].join('\t')).join('\n'));await page.locator('#applyImport').click();
  const start=Date.now();await page.locator('#calculate').click();
  await page.waitForFunction(()=>document.getElementById('statParts').textContent==='127');
  const firstVisibleMs=Date.now()-start;
  assert(await page.locator('#progress').isVisible());assert(await page.locator('#calculate').isDisabled());assert(await page.locator('#print').isEnabled());
  assert.equal(await page.locator('#cancel').textContent(),'Оставить этот раскрой');
  const sheetCount=Number(await page.locator('#statSheets').textContent());
  await page.locator('.sheet-card').last().click();
  await page.waitForTimeout(1500);
  const currentCount=Number(await page.locator('#statSheets').textContent());
  assert.equal(await page.locator('#sheetLabel').textContent(),'Лист '+Math.min(sheetCount,currentCount)+' из '+currentCount);
  assert(polls.some(s=>s.status==='running'&&!s.hasMap&&s.revision>0),'Unchanged polls must not transfer/render another large map');
  await page.locator('#cancel').click();assert(await page.locator('#calculate').isEnabled());
  assert.equal(await page.locator('#statParts').textContent(),'127');assert.match(await page.locator('#serverNotice').textContent(),/Поиск остановлен/);
  await page.waitForTimeout(800);assert.equal(await page.locator('#statSheets').textContent(),String(currentCount));
  // Export the actual displayed checkpoint; it must remain a complete PSS plan.
  await page.locator('#export').click();const downloadPromise=page.waitForEvent('download');await page.locator('#downloadJson').click();const download=await downloadPromise;
  const displayed=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  require('../../src/completed-rip-validator').validateCompleted(displayed.parameters,displayed,displayed.plan,displayed.equipmentProfile);
  assert.equal(displayed.metrics.parts,127);assert.deepEqual(errors,[]);
  const report={orderParts:127,firstVisibleMs,firstVerifiedMs:polls.find(s=>s.hasMap)?.timing.firstVerifiedMs,firstSheets:sheetCount,retainedSheets:currentCount,previewWhileRunning:true,unchangedPollsOmitMap:true,cancelKeepsMap:true,exportIndependentlyValidated:true,jsErrors:errors};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();await service.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
