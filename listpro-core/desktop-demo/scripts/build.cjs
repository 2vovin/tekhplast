'use strict';
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
async function run(){
 if(process.platform!=='win32')throw Error('Build and packaged smoke must run on Windows.');
 require('./prepare.cjs').build();
 const deps=path.resolve(__dirname,'../../desktop/node_modules');
 const builder=require(path.join(deps,'electron-builder'));
 await builder.build({projectDir:path.resolve(__dirname,'..'),targets:builder.Platform.WINDOWS.createTarget('portable',builder.Arch.x64),config:{electronVersion:require(path.join(deps,'electron/package.json')).version}});
 const dir=path.resolve(__dirname,'../../desktop/dist'),version=require('../package.json').version,exe=path.join(dir,`ListPro-Demo-${version}-win-x64.exe`),report=path.join(dir,'demo-windows-smoke.json');
 if(fs.existsSync(report))fs.unlinkSync(report);
 const child=spawn(exe,['--smoke-report='+report],{stdio:'inherit'});let failure;child.on('error',e=>failure=e);child.on('exit',c=>{if(c)failure=Error('Demo executable exit '+c);});
 const deadline=Date.now()+180000;while(!fs.existsSync(report)){if(failure)throw failure;if(Date.now()>deadline){child.kill();throw Error('Packaged demo smoke timed out');}await new Promise(r=>setTimeout(r,400));}
 const evidence=JSON.parse(fs.readFileSync(report,'utf8'));if(!evidence.ok||!evidence.packaged||evidence.platform!=='win32')throw Error(JSON.stringify(evidence));
 const binary=fs.readFileSync(exe);if(binary.subarray(0,2).toString()!=='MZ')throw Error('Invalid EXE');
 const sha256=crypto.createHash('sha256').update(binary).digest('hex');const result={...evidence,commit:process.env.GITHUB_SHA,file:path.basename(exe),sha256,bytes:binary.length};
 fs.writeFileSync(path.join(dir,'demo-build-evidence.json'),JSON.stringify(result,null,2));console.log('DEMO_WINDOWS_SMOKE_REPORT '+JSON.stringify(result));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
