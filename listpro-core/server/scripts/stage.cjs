'use strict';
const fs=require('node:fs'),path=require('node:path'),base=path.resolve(__dirname,'../..');
function stage(out){require('./build.cjs').build();const modules=require('../../web/build.cjs').build().modules,files=new Set([...modules,'server/main.cjs','server/worker.cjs','server/dist/index.html','server/package.json','web/edge-banding.js','desktop-demo/experience-store.cjs','scripts/train-experience.js','scripts/self-train-experience.js']);
 for(const id of files){const dest=path.join(out,id);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(base,id),dest);}return [...files];}
if(require.main===module){if(!process.argv[2])throw Error('Supply a new release directory');console.log('Staged files:',stage(path.resolve(process.argv[2])).length);}module.exports={stage};
