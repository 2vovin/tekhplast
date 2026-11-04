'use strict';
const fs=require('node:fs'),path=require('node:path'),{bundle}=require('./bundle.cjs');
function build(){
 const root=path.resolve(__dirname,'..'),files={};
 function read(id){files[id]=fs.readFileSync(path.join(root,id),'utf8');}
 for(const dir of ['src'])for(const name of fs.readdirSync(path.join(root,dir)))if(name.endsWith('.js'))read(dir+'/'+name);
 for(const id of ['web/engine.cjs','web/styles.css','web/app.js','web/edge-banding.js','web/template.html','web/examples.json','desktop/table-import.js'])read(id);
 return bundle(files);
}
if(require.main===module){const {html,modules}=build();fs.writeFileSync(path.join(__dirname,'index.html'),html);fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});fs.writeFileSync(path.join(__dirname,'dist/index.html'),html);console.log('Built standalone site: '+Buffer.byteLength(html)+' bytes, '+modules.length+' core modules');}
module.exports={build};