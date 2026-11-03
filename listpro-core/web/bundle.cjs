'use strict';
function bundle(files){
 const resolve=(from,rel)=>{
  if(!rel.startsWith('.'))throw Error('Browser bundle cannot import '+rel);
  const bits=from.split('/');bits.pop();
  for(const b of rel.split('/')){if(b==='..')bits.pop();else if(b!=='.')bits.push(b);}
  const name=bits.join('/');return Object.hasOwn(files,name)?name:name+'.js';
 };
 const used=new Set();
 function visit(id){if(used.has(id))return;if(!Object.hasOwn(files,id))throw Error('Missing module '+id);used.add(id);
  for(const m of files[id].matchAll(/require\(['"]([^'"]+)['"]\)/g))visit(resolve(id,m[1]));
 }
 visit('web/engine.cjs');
 const factory=[...used].sort().map(id=>JSON.stringify(id)+':function(module,exports,require){\n'+files[id]+'\n}').join(',\n');
 const worker="'use strict';\nconst factories={"+factory+"};\n"+
 'const cache={};function load(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;factories[id](module,module.exports,rel=>{const bits=id.split("/");bits.pop();for(const b of rel.split("/")){if(b==="..")bits.pop();else if(b!==".")bits.push(b);}let k=bits.join("/");if(!factories[k])k+=".js";return load(k);});return module.exports;}\n'+
 'const engine=load("web/engine.cjs");self.onmessage=({data:m})=>{try{let result;if(m.action==="validate")result=engine.verify(engine.clean(m.input),m.layout);else if(m.action==="solve")result=engine.solve(m.input,{...m.options,progress:data=>self.postMessage({type:"progress",data})});else throw Error("Unknown worker action");self.postMessage({type:"result",result});}catch(e){self.postMessage({type:"error",message:e.message});}};';
 const scriptSafe=s=>s.replace(/<\/script/gi,'<\\/script');
 const replacements={__CSS__:files['web/styles.css'],__APP__:scriptSafe(files['web/app.js']),__EXAMPLES__:JSON.stringify(JSON.parse(files['web/examples.json'])).replace(/</g,'\\u003c'),__WORKER__:scriptSafe(worker),__IMPORT__:scriptSafe(files['desktop/table-import.js'])};
 const html=files['web/template.html'].replace(/__(?:CSS|APP|EXAMPLES|WORKER|IMPORT)__/g,k=>replacements[k]);
 return{html,worker,modules:[...used].sort()};
}
module.exports={bundle};