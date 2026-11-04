const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.LISTPRO_BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>document.getElementById('statParts').textContent==='44');
 await page.locator('[data-tab="parts"]').click();
 const band={top:'.4',right:'.8',bottom:'1',left:'2'};
 for(const [side,value]of Object.entries(band))await page.locator('#partsBody [data-row="0"] [data-edge="'+side+'"]').selectOption(String(Number(value)));
 assert.equal(await page.locator('#statCuts').textContent(),'60 / 7');assert.equal(await page.locator('#drawing .edge-band').count(),112);
 // 20 landscape parts, 8 portrait parts: verify all four asymmetric edges in both orientations.
 const marks=await page.locator('#drawing .piece').evaluateAll(gs=>gs.map(g=>({w:Number(g.querySelector('rect').getAttribute('width')),edges:[...g.querySelectorAll('.edge-band')].map(e=>[e.dataset.edgeSource,e.dataset.edgeSide,Number(e.dataset.thickness)])})));
 assert.equal(marks.filter(a=>a.w===500).length,20);assert.equal(marks.filter(a=>a.w===300).length,8);
 for(const m of marks)assert.deepEqual(m.edges,m.w===500?[['top','top',.4],['right','right',.8],['bottom','bottom',1],['left','left',2]]:[['top','right',.4],['right','bottom',.8],['bottom','left',1],['left','top',2]]);
 assert.equal(await page.locator('#sheetGallery .edge-band').count(),176);
 await page.locator('[data-tab="map"]').click();await page.locator('#viewSingle').click();
 await page.locator('#sheetDetail').screenshot({path:path.join(__dirname,'edge-bands.png')});
 const save=page.waitForEvent('download');await page.locator('#save').click();const d=await save,project=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
 assert.deepEqual(project.project.pieces[0].edges,{top:.4,right:.8,bottom:1,left:2});
 await page.locator('#export').click();const svgDownload=page.waitForEvent('download');await page.locator('#downloadSvg').click();assert.match(fs.readFileSync(await (await svgDownload).path(),'utf8'),/stroke-dasharray="0 5"/);await page.locator('[data-close="exportModal"]').click();
 // Reopen JSON through the actual file import, then recalculate.
 await page.locator('#importOpen').click();await page.locator('#fileInput').setInputFiles({name:'edges.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>document.getElementById('importModal').hidden);
 for(const [side,value]of Object.entries(band))assert.equal(await page.locator('#partsBody [data-row="0"] [data-edge="'+side+'"]').inputValue(),String(Number(value)));
 await page.locator('#calculate').click();await page.waitForFunction(()=>!document.getElementById('calculate').disabled,{},{timeout:60000});assert.equal(await page.locator('#drawing .edge-band').count(),112);
 await page.locator('[data-tab="parts"]').click();await page.locator('#partsBody [data-row="0"] [data-edge="top"]').selectOption('0');assert.equal(await page.locator('#drawing .edge-band').count(),84);
 // Long per-sheet inventory remains compact and immediately beside the fitted map.
 await page.locator('#panel-parts [data-example="171"]').click();await page.waitForFunction(()=>document.getElementById('statParts').textContent==='171');
 for(let i=0;i<9;i++)await page.locator('#nextSheet').click();
 const map=await page.locator('#drawing > svg').boundingBox(),list=await page.locator('#sheetParts').boundingBox();assert(list.x-map.x-map.width<14);assert(list.width<=210);assert(list.height<800);assert.equal(await page.locator('#sheetPartsBody tr').count(),21);
 await page.locator('#sheetDetail').screenshot({path:path.join(__dirname,'compact-list.png')});
 // An edged list may wrap: check pagination without losing positions or bands.
 const p={...project.project,pieces:Array.from({length:25},(_,i)=>({id:i+1,l:100+i,w:100,q:1,grain:false,edges:{top:.4,right:.8,bottom:1,left:2}}))};
 await page.locator('#importOpen').click();await page.locator('#fileInput').setInputFiles({name:'long-edges.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({project:p}))});await page.waitForFunction(()=>document.getElementById('importModal').hidden);await page.locator('#calculate').click();await page.waitForFunction(()=>document.getElementById('statParts').textContent==='25',{},{timeout:60000});
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.print-page').count(),3);const header=await page.locator('.print-page th').first().boundingBox(),row=await page.locator('.print-page tbody tr').first().boundingBox();assert(header.y+header.height<=row.y+1);assert.equal(await page.locator('.print-page tbody tr').count(),25);assert.equal(await page.locator('.print-page .edge-band').count(),300);
 await page.pdf({path:path.join(__dirname,'print-edges.pdf'),preferCSSPageSize:true});
 assert.deepEqual(errors,[]);await browser.close();console.log(JSON.stringify({passed:true,list,map,checks:['asymmetric rotated edges','immediate updates','gallery','SVG export','JSON round trip and recalculation','remove edge','compact 21-row list','three print pages preserve 25 positions']}));
})().catch(e=>{console.error(e);process.exit(1)});
