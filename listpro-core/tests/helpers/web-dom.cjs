'use strict';
// Lightweight DOM contract test, NOT a browser layout/screenshot test.
function harness(html,app,workerSource,evaluate){
 const elements=[],ids=new Map(),downloads=[],pending=[];
 class Element{
  constructor(tag,attrs={}){this.tagName=tag.toUpperCase();this.attrs=attrs;this.id=attrs.id;this.dataset={};for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;
   this.hidden=Object.hasOwn(attrs,'hidden');this.disabled=false;this.value=attrs.value||'';this.style={};this.textContent='';this.checked=Object.hasOwn(attrs,'checked');this.offsetParent={};this.listeners={};
   const classes=new Set((attrs.class||'').split(' '));this.classList={add:k=>classes.add(k),remove:k=>classes.delete(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k),contains:k=>classes.has(k)};
  }
  set innerHTML(v){this.html=v;this.firstElementChild=v?new Element('svg'):null;}get innerHTML(){return this.html||'';}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(k,fn){this.listeners[k]=fn;}
  querySelector(){return elements.find(e=>e.tagName==='BUTTON');}querySelectorAll(){return [];}focus(){document.activeElement=this;}click(){if(this.tagName==='A')downloads.push(this.download);else this.onclick?.({target:this});}scrollIntoView(){}
 }
 for(const m of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
  const attrs={};for(const a of m[2].matchAll(/([a-z][a-z0-9-]*)(?:="([^"]*)")?/gi))attrs[a[1]]=a[2]??'';
  const e=new Element(m[1],attrs);elements.push(e);if(e.id)ids.set(e.id,e);
 }
 function query(selector){return selector.split(',').flatMap(s=>{s=s.trim();if(s.includes(' '))return [];
  if(s.startsWith('#'))return ids.has(s.slice(1))?[ids.get(s.slice(1))]:[];
  if(s.startsWith('.'))return elements.filter(e=>e.classList.contains(s.slice(1)));
  const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);if(m)return elements.filter(e=>Object.hasOwn(e.attrs,m[1])&&(m[2]===undefined||e.attrs[m[1]]===m[2]));
  return elements.filter(e=>e.tagName===s.toUpperCase());
 });}
 const document={getElementById:id=>ids.get(id),querySelectorAll:query,addEventListener(){},createElement:t=>new Element(t),activeElement:null};
 ids.get('examples').textContent=html.match(/<script id="examples"[^>]*>([\s\S]*?)<\/script>/)[1];
 ids.get('worker-source').textContent=workerSource;
 class MockWorker{
  constructor(){this.self={postMessage:m=>pending.push(()=>this.onmessage?.({data:m}))};evaluate(workerSource,{self:this.self});}
  postMessage(data){pending.push(()=>{if(!this.closed)this.self.onmessage({data});});}
  terminate(){this.closed=true;}
 }
 const context={document,Worker:MockWorker,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout:()=>1,clearTimeout(){},window:{print:()=>{context.printed=true;}}};
 evaluate(html.match(/<script>('use strict';[\s\S]*?)<\/script><script>/)?.[1]||'',context);
 // The importer is assigned by the caller to avoid matching implementation script contents.
 evaluate(app,context);
 function flush(){let limit=10000;while(pending.length&&limit--)pending.shift()();if(!limit)throw Error('Unbounded worker message loop');}
 return{document,ids,context,downloads,flush,elements};
}
module.exports={harness};
