'use strict';
const fs=require('node:fs'),path=require('node:path');
function read(file){try{if(fs.statSync(file).size>8*1024*1024)return null;return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function write(file,bank){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+process.pid+'.'+Date.now()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(bank),{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
function update(file,fn){fs.mkdirSync(path.dirname(file),{recursive:true});const lock=file+'.lock';let fd;try{fd=fs.openSync(lock,'wx');const next=fn(read(file));write(file,next);return next;}finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}}
module.exports={read,write,update};
