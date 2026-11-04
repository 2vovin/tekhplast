'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),{Worker}=require('node:worker_threads'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('demoCalculate',input=>new Promise((resolve,reject)=>{const w=new Worker(path.resolve(__dirname,'../worker.cjs'),{workerData:{input,coreBase:path.resolve(__dirname,'../..')}});w.on('error',reject);w.on('message',m=>{if(m.type==='progress')return;w.terminate();m.type==='error'?reject(Error(m.message)):resolve(m.result);});}));
 await page.addInitScript(()=>{window.listproDemo={calculate:input=>window.demoCalculate(input),cancel:()=>{},onProgress:()=>{}};});
 await page.goto('http://127.0.0.1:4173');
 const result=await require('./gui-smoke.cjs').run({webContents:{executeJavaScript:code=>page.evaluate(code)}});
 await page.locator('#viewThree').click();await page.locator('#workspace').screenshot({path:path.resolve(__dirname,'../demo-preview.png')});
 require('node:assert/strict').deepEqual(errors,[]);await browser.close();console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
