'use strict';
const {fromTree}=require('./deferred-strip-patterns'),{verifyCompleted:verifyDeferred}=require('./completed-rip'),{buildCompletedLayout:buildRawLayout}=require('./completed-rip-layout'),{estimateSheets}=require('./sheet-area-estimate'),{searchCompleted}=require('./completed-rip-search');
const VERSION=1,PROFILE='completed-rip-v1';
const empty=()=>({version:VERSION,profile:PROFILE,solves:0,patterns:[],recipes:[],books:[]});
function features(p){const area=(p.sheetW-2*p.trim)*(p.sheetH-2*p.trim),n=p.pieces.reduce((s,a)=>s+a.q,0);return [p.sheetW/p.sheetH,n,p.pieces.reduce((s,a)=>s+a.l*a.w*a.q,0)/area, p.pieces.reduce((s,a)=>s+Math.max(a.l/a.w,a.w/a.l)*a.q,0)/n];}
function similarity(a,b){return a.reduce((s,v,i)=>s+Math.abs(v-b[i])/Math.max(1,Math.abs(v),Math.abs(b[i])),0)/a.length;}
function safePattern(n,depth=0,counter={n:0}){
 if(!n||depth>32||++counter.n>10000)throw Error('Invalid experience pattern');
 if(n.leaf){if(![n.l,n.w].every(x=>Number.isFinite(x)&&x>0&&x<=20000)||typeof n.rotated!=='boolean')throw Error('Invalid experience leaf');return {leaf:true,l:n.l,w:n.w,rotated:n.rotated};}
 if(!['H','V'].includes(n.axis)||!Array.isArray(n.children)||!n.children.length||n.children.length>2500)throw Error('Invalid experience branch');
 return {axis:n.axis,children:n.children.map(c=>safePattern(c,depth+1,counter))};
}
function normalize(value){
 if(!value||value.version!==VERSION||value.profile!==PROFILE)return empty();
 const bank=empty();bank.solves=Number.isSafeInteger(value.solves)&&value.solves>=0?value.solves:0;
 for(const r of (Array.isArray(value.patterns)?value.patterns:[]).slice(0,128))try{const pattern=safePattern(r.pattern);bank.patterns.push({pattern,uses:Math.min(1000000,Math.max(1,Number(r.uses)||1))});}catch{}
 bank.recipes=(Array.isArray(value.recipes)?value.recipes:[]).filter(r=>r.move==='wide-48'&&Array.isArray(r.features)&&r.features.length===4&&r.features.every(Number.isFinite)).slice(0,64).map(r=>({move:r.move,features:r.features,uses:Math.max(1,Number(r.uses)||1)}));
 for(const b of (Array.isArray(value.books)?value.books:[]).slice(0,16))try{if(!Array.isArray(b.patterns)||b.patterns.length>64)continue;bank.books.push({patterns:b.patterns.map(p=>safePattern(p))});}catch{}
 return bank;
}
function patternsOf(p,result){return result.sheets.map(sh=>fromTree(sh.tree,p.kerf));}
function remember(bank,p,result){
 require('./completed-rip-validator').validateCompleted(p,result,result.plan,result.equipmentProfile);
 // Recompile and replay before admitting any move into the database.
 const raw=patternsOf(p,result);verifyDeferred(p,buildRawLayout(p,raw));const next=normalize(bank);next.solves++;
 function encode(n){if(n.part){const a=p.pieces.find(a=>a.id===n.part.id);return{leaf:true,l:a.l,w:a.w,rotated:!!n.part.rotated};}return{axis:n.axis,children:n.children.map(encode)};}
 for(const n of raw){const pattern=encode(n),key=JSON.stringify(pattern),old=next.patterns.find(r=>JSON.stringify(r.pattern)===key);if(old)old.uses++;else next.patterns.push({pattern,uses:1});}
 next.patterns.sort((a,b)=>b.uses-a.uses);next.patterns=next.patterns.slice(0,128);
 if(result.learningMove==='wide-48'&&result.metrics.sheets===estimateSheets(p).minimumSheets){const f=features(p),old=next.recipes.find(r=>similarity(f,r.features)<.05);if(old)old.uses++;else next.recipes.push({move:'wide-48',features:f,uses:1});next.recipes.sort((a,b)=>b.uses-a.uses);next.recipes=next.recipes.slice(0,64);}
 const book={patterns:raw.map(encode)},bookKey=JSON.stringify(book);next.books=next.books.filter(b=>JSON.stringify(b)!==bookKey);next.books.unshift(book);next.books=next.books.slice(0,16);
 while(JSON.stringify(next).length>6*1024*1024&&(next.patterns.length>1||next.books.length>1)){if(next.books.length>1)next.books.pop();else next.patterns.pop();}
 return next;
}
function score(r,objective){return objective==='cuts'?[r.metrics.sheets,r.metrics.cuts,r.metrics.turns,-r.metrics.largestWaste]:[r.metrics.sheets,-r.metrics.largestWaste,r.metrics.cuts,r.metrics.turns];}
const better=(a,b)=>!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((x,j)=>x===b[j]));
function solveWithExperience(p,value,baseSolve,options={}){
 const bank=normalize(value),objective=options.objective||'remnants',min=estimateSheets(p).minimumSheets,stats={patterns:bank.patterns.length,solves:bank.solves,matched:0,rejected:0,used:false,nearMatches:0,recipeUsed:false,booksMatched:0};let best=null;
 const keep=r=>{if(better(score(r,objective),best&&score(best,objective)))best=r;};
 const available=p.pieces.map(a=>a.q),prefix=[];
 function bind(n,counts,near){if(!n.leaf)return {axis:n.axis,children:n.children.map(c=>bind(c,counts,near))};
  const matches=p.pieces.map((a,i)=>({a,i,d:Math.abs(a.l/n.l-1)+Math.abs(a.w/n.w-1)})).filter(({a,i,d})=>counts[i]>0&&(!n.rotated||a.grain===false)&&(near?d<=.08:d<1e-10)).sort((a,b)=>a.d-b.d);
  if(!matches.length)throw Error('No matching physical part');const {a,i,d}=matches[0];counts[i]--;if(d>1e-10)stats.nearMatches++;return {part:{id:a.id,rotated:n.rotated},w:n.rotated?a.w:a.l,h:n.rotated?a.l:a.w};
 }
 function finish(r){stats.used=!!r.experienceOrigin;r.sheetEstimate=estimateSheets(p,r.metrics.sheets);r.experienceInfo=stats;return r;}
 function candidate(patterns,counts){
  const sub={...p,pieces:p.pieces.map((a,i)=>({...a,q:counts[i]})).filter(a=>a.q)};let tail=[];
  if(sub.pieces.length){const remaining=baseSolve(sub,{iterations:Math.min(options.iterations||100,30),examples:[]});tail=patternsOf(remaining.parameters,remaining);const rebind=n=>{if(n.part)n.part.id=sub.pieces[n.part.id-1].id;else n.children.forEach(rebind);};tail.forEach(rebind);}
  const r=verifyDeferred(p,buildRawLayout(p,[...patterns,...tail]));r.learningMove='stored-strip-tree';r.experienceOrigin=true;keep(r);
 }
 // A complete opening book preserves combinations between complementary sheets.
 // It avoids greedily using a common pattern twice and starving another sheet.
 for(const book of bank.books)for(const near of [false,true]){
  const counts=p.pieces.map(a=>a.q);try{const patterns=book.patterns.map(n=>bind(n,counts,near));candidate(patterns,counts);stats.booksMatched++;break;}catch{stats.rejected++;}
 }
 if(best&&best.metrics.sheets===min&&!options.forceSearch)return finish(best);
 // Prefer exact openings, then try the same tree with nearby actual dimensions.
 for(const near of [false,true])for(const rec of bank.patterns){
  for(let repeats=0;repeats<2500;repeats++){
   const counts=available.slice();let pattern;try{pattern=bind(rec.pattern,counts,near);}catch{break;}
   const sub={...p,pieces:p.pieces.map((a,i)=>({...a,q:available[i]-counts[i]})).filter(a=>a.q)};
   try{verifyDeferred(sub,buildRawLayout(sub,[pattern]));}catch{stats.rejected++;break;}
   prefix.push(pattern);available.splice(0,available.length,...counts);stats.matched++;
  }
 }
 if(prefix.length)try{
  const sub={...p,pieces:p.pieces.map((a,i)=>({...a,q:available[i]})).filter(a=>a.q)};
  let tail=[];if(sub.pieces.length){const remaining=baseSolve(sub,{iterations:Math.min(options.iterations||100,30),examples:[]});tail=patternsOf(remaining.parameters,remaining);const rebind=n=>{if(n.part)n.part.id=sub.pieces[n.part.id-1].id;else n.children.forEach(rebind);};tail.forEach(rebind);}
  const r=verifyDeferred(p,buildRawLayout(p,[...prefix,...tail]));r.learningMove='stored-strip-tree';r.experienceOrigin=true;keep(r);
 }catch{stats.rejected++;}
 const recipe=bank.recipes.find(r=>similarity(features(p),r.features)<.2);
 if((!best||best.metrics.sheets>min)&&recipe){stats.recipeUsed=true;options.progress?.({text:'База опыта: пробуем ранее удачный широкий перебор полос',percent:5});searchCompleted(p,{seed:options.seed??42,iterations:options.iterations||100,onBest:r=>{r.learningMove='wide-48';r.experienceOrigin=true;keep(r);}});}
 if(!best||best.metrics.sheets>min||options.forceSearch)keep(baseSolve(p,options));
 if(!best)throw Error('No accepted cutting plan');return finish(best);
}
module.exports={empty,normalize,remember,solveWithExperience,VERSION,PROFILE};
