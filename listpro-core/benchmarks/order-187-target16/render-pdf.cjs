'use strict';
const {chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent(fs.readFileSync(path.join(__dirname,'maps.html'),'utf8'));assert.equal(await page.locator('article').count(),16);assert.equal(await page.locator('article svg g').count(),187);
  await page.pdf({path:process.argv[2]||path.join(__dirname,'maps.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.screenshot({path:'/tmp/order187-maps.png',fullPage:false});
  await page.setContent(fs.readFileSync(path.join(__dirname,'sequence.html'),'utf8'));
  const frames=await page.evaluate(()=>{
   const slider=document.getElementById('step');
   for(let i=0;i<=+slider.max;i++){slider.value=i;slider.dispatchEvent(new Event('input'));if(!document.getElementById('caption').textContent.startsWith('Шаг '+(i+1)+' / '))throw Error('Wrong operation caption');if(document.getElementById('frame').innerHTML.includes('NaN'))throw Error('Invalid frame geometry');}
   return +slider.max+1;
  });
  assert.equal(frames,1377);assert.deepEqual(errors,[]);console.log(JSON.stringify({sheets:16,parts:187,frames,jsErrors:errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
