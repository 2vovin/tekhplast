'use strict';
const {collect}=require('./pss-waste-local');
const clone=x=>JSON.parse(JSON.stringify(x));
function area(n){return n.kind==='part'?n.rect.w*n.rect.h:n.kind==='cut'?area(n.first)+area(n.second):0;}
function compare(strategy,axis){return (a,b)=>{
 const size=n=>axis==='V'?n.rect.w:n.rect.h;
 const kim=n=>area(n)/(n.rect.w*n.rect.h||1);
 if(strategy==='utilization')return kim(b)-kim(a)||size(b)-size(a);
 return (strategy==='size-asc'?1:-1)*(size(a)-size(b));
};}
function order(nodes,strategy,axis){
 const a=nodes.slice().sort(compare(strategy,axis));
 if(strategy==='narrow-centre'&&a.length>2){const last=a.splice(1,1)[0];a.push(last);}
 return a;
}
function move(n,x,y){
 const dx=x-n.rect.x,dy=y-n.rect.y;
 function shift(t){t.rect.x+=dx;t.rect.y+=dy;if(t.kind==='cut'){t.pos+=t.axis==='V'?dx:dy;shift(t.first);shift(t.second);}}
 shift(n);return n;
}
function join(nodes,rect,axis,k){
 function rec(i,r){
  const node=move(nodes[i],r.x,r.y);
  if(i===nodes.length-1)return node;
  const v=axis==='V',size=v?node.rect.w:node.rect.h,pos=(v?r.x:r.y)+size;
  const tail=v?{...r,x:pos+k,w:r.w-size-k}:{...r,y:pos+k,h:r.h-size-k};
  return {kind:'cut',rect:{...r},axis,pos,kerf:k,first:node,second:rec(i+1,tail)};
 }return rec(0,rect);
}
function sortStrips(layout,kerf,strategy='size-desc'){
 if(!['size-desc','size-asc','utilization','narrow-centre','original'].includes(strategy))throw Error('Unknown sorting strategy');
 const s=clone(layout);delete s.plan;delete s.verification;delete s.metrics;delete s.search;
 if(strategy==='original')return collect(s);
 function subtree(n){
  if(n.kind!=='cut')return n;
  const axis=n.axis,parts=[];
  function flatten(t){if(t.kind==='cut'&&t.axis===axis){flatten(t.first);flatten(t.second);}else parts.push(subtree(t));}
  flatten(n);
  // A zero-width terminal kerf remainder may never become the leading child.
  const useful=parts.filter(t=>t.kind!=='waste'),waste=parts.filter(t=>t.kind==='waste');
  return join([...order(useful,strategy,axis),...waste],n.rect,axis,kerf);
 }
 for(const sh of s.sheets){
  let node=sh.tree;const strips=[];
  for(let i=0;i<sh.primaryStrips.length-1;i++){strips.push(subtree(node.first));node=node.second;}
  const terminal=node;
  const sorted=order(strips,strategy,'V');
  sh.tree=join([...sorted,terminal],sh.tree.rect,'V',kerf);
  sh.primaryStrips=[];let current=sh.tree,path='r',index=1;
  while(current.kind==='cut'&&index<=sorted.length){
   sh.primaryStrips.push({index,rect:{...current.first.rect},path:path+'/0'});
   current=current.second;path+='/1';index++;
  }
  sh.primaryStrips.push({index,rect:{...current.rect},path});
 }
 s.sortingStrategy=strategy;return collect(s);
}
module.exports={sortStrips,area};