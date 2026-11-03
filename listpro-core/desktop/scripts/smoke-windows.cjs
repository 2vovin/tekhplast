'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),crypto=require('node:crypto');
async function main(){
 if(process.platform!=='win32')throw Error('Portable smoke test requires Windows.');
 const dir=path.resolve(__dirname,'../dist'),version=require('../package.json').version;
 const exe=path.join(dir,'ListPro-Mebel-'+version+'-win-x64.exe'),reportFile=path.join(dir,'windows-smoke.json');
 if(fs.existsSync(reportFile))fs.unlinkSync(reportFile);
 const binary=fs.readFileSync(exe);if(binary.subarray(0,2).toString()!=='MZ')throw Error('Not a Windows executable');
 const digest=crypto.createHash('sha256').update(binary).digest('hex');
 const child=spawn(exe,['--smoke-report='+reportFile],{stdio:'inherit'});
 let failure=null;child.on('error',e=>failure=e);child.on('exit',code=>{if(code!==0)failure=Error('Portable exit '+code);});
 const end=Date.now()+240000;
 while(!fs.existsSync(reportFile)){
  if(failure)throw failure;
  if(Date.now()>end){child.kill();throw Error('Packaged Windows GUI smoke timeout');}
  await new Promise(r=>setTimeout(r,500));
 }
 const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
 if(!report.ok||!report.packaged||report.platform!=='win32')throw Error(JSON.stringify(report));
 console.log('WINDOWS_SMOKE_REPORT '+JSON.stringify({...report,commit:process.env.GITHUB_SHA}));
 console.log('WINDOWS_BUILD_SHA256 '+JSON.stringify({file:path.basename(exe),sha256:digest,bytes:binary.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
