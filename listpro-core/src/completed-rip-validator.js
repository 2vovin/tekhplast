'use strict';
// Independent replay: no search, compiler, pattern or legacy geometry imports.
// Coordinates in the material frame are reconstructed from the actual blade stroke.
function validateCompleted(p,layout,plan,profile){
 const ok=(yes,message)=>{if(!yes)throw Error('Completed-rip replay: '+message);};
 const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;
 const same=(a,b)=>a&&b&&['x','y','w','h'].every(k=>near(a[k],b[k]));
 const within=(a,b)=>a.x>=b.x-1e-7&&a.y>=b.y-1e-7&&a.x+a.w<=b.x+b.w+1e-7&&a.y+a.h<=b.y+b.h+1e-7;
 ok(layout.model==='completed-rip-v1'&&plan.model===layout.model,'model');
 ok(profile.id==='completed-rip-v1'&&profile.retainedSide==='HIGH_MATERIAL'&&profile.seriesCompletionRequired===true&&profile.maxTurnsPerBlank===1&&profile.maxSheetTurns===0,'retained profile');
 ok(p.kerf>0&&p.trim>=0&&p.sheetW>2*p.trim&&p.sheetH>2*p.trim,'parameters');
 ok(new Set(p.pieces.map(a=>a.id)).size===p.pieces.length&&p.pieces.every(a=>a.l>0&&a.w>0&&Number.isInteger(a.q)&&a.q>0),'order parameters');
 const requested=new Map(p.pieces.map(a=>[a.id,a])),seenParts=new Set(),nodes=new Map(),allParts=[],wastes=[];
 const useful={x:p.trim,y:p.trim,w:p.sheetW-2*p.trim,h:p.sheetH-2*p.trim};
 let number=0;
 function inspect(n,r,si,path){
  ok(same(n.rect,r),'tree rectangle '+path);ok(r.w>=0&&r.h>=0,'negative rectangle');
  if(n.kind==='part'){
   const a=requested.get(n.part.id),key=n.part.id+':'+n.part.instance;ok(a&&!seenParts.has(key),'part identity '+key);
   ok(Number.isInteger(n.part.instance)&&n.part.instance>=1&&n.part.instance<=a.q,'part instance');
   ok(!n.part.rotated||a.grain===false,'texture');
   ok(near(r.w,n.part.rotated?a.w:a.l)&&near(r.h,n.part.rotated?a.l:a.w),'part dimensions');ok(within(r,useful),'trim margin');
   seenParts.add(key);allParts.push({...r,...n.part,sheet:si});return;
  }
  if(n.kind==='waste'){wastes.push({sheet:si,...r});return;}
  ok(n.kind==='cut'&&['H','V'].includes(n.axis),'cut kind');ok(n.number===++number,'tree cut numbering');
  const v=n.axis==='V',span=v?r.w:r.h,offset=n.pos-(v?r.x:r.y),used=Math.min(p.kerf,span-offset),edge=span-offset<=p.kerf&&n.phase!=='trailing-trim';
  ok((offset>0||offset===0&&n.phase==='leading-trim'&&p.trim===p.kerf)&&offset<span&&near(n.kerf,p.kerf)&&near(n.kerfUsed,used),'cut position/kerf');
  ok(n.edgeFinish===edge,'edge finish flag');
  if(edge)ok(profile.allowTerminalBladeOverhang===true&&n.first.kind!=='waste'&&n.second.kind==='waste','terminal sizing only');
  const a=v?{...r,w:offset}:{...r,h:offset},b=v?{...r,x:n.pos+used,w:span-offset-used}:{...r,y:n.pos+used,h:span-offset-used};
  nodes.set(si+':'+n.number,{n,r,a,b,edge});

  inspect(n.first,a,si,path+'/0');inspect(n.second,b,si,path+'/1');
 }
 layout.sheets.forEach((sh,si)=>{ok(['H','V'].includes(sh.axis),'initial axis');inspect(sh.tree,{x:0,y:0,w:p.sheetW,h:p.sheetH},si,'s'+si);});
 ok(seenParts.size===p.pieces.reduce((s,a)=>s+a.q,0),'order incomplete');
 layout.sheets.forEach((sh,si)=>{
  const expected=allParts.filter(a=>a.sheet===si);ok(sh.parts.length===expected.length,'map count');
  for(const a of expected)ok(sh.parts.some(b=>a.id===b.id&&a.instance===b.instance&&same(a,b)&&!!a.rotated===!!b.rotated),'map differs from tree');
 });
 const states=new Map(),ever=new Set(),closed=new Set(),loaded=new Set(),bands=new Map(),usedNodes=new Set(),frames=[],partTurns=[],actualStrips=[];
 const future=new Map();for(const o of plan.operations)if(['cut','rotate'].includes(o.type)){const a=future.get(o.inputBlankId)||[];a.push(o.step);future.set(o.inputBlankId,a);}
 const outputMap=new Map(plan.outputs.map(o=>[o.blankId,o]));ok(outputMap.size===plan.outputs.length,'duplicate terminal outputs');
 const contained=(si,r)=>allParts.filter(a=>a.sheet===si&&within(a,r));
 const dims=b=>b.q%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h};
 const size=(o,b)=>{const d=dims(b);ok(near(o.w,d.w)&&near(o.h,d.h)&&o.machineOrientation===b.q*90,'machine dimensions/orientation');};
 const add=(id,b)=>{ok(typeof id==='string'&&!ever.has(id),'reused blank id');ever.add(id);states.set(id,b);};
 let open=null;
 let active=null,cuts=0,turns=0,feeds=0,cutLength=0,stages=1,edgeFinishingCuts=0;
 for(let index=0;index<plan.operations.length;index++){
  const o=plan.operations[index];ok(o.step===index+1,'step numbering');
  if(o.type==='load'){
   ok(Number.isInteger(o.sheet)&&layout.sheets[o.sheet]&&!loaded.has(o.sheet),'sheet load');
   for(const [bid,t]of states)ok(!(future.get(bid)||[]).some(s=>s>o.step),'unfinished previous sheet');
   ok(o.initialCutAxis===layout.sheets[o.sheet].axis&&profile.initialCutAxes.includes(o.initialCutAxis),'initial loading direction');
   const b={rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,local:0,ancestry:0,held:true,lock:o.initialCutAxis,primary:true,sheet:o.sheet,axis:o.initialCutAxis,stage:1,lastAxis:o.initialCutAxis,parent:null,role:'HELD_SHEET',node:layout.sheets[o.sheet].tree};
   size(o,b);add(o.blankId,b);active=o.blankId;loaded.add(o.sheet);bands.set(o.sheet,[]);continue;
  }
  if(o.type==='startRip'){
   const b=states.get(o.inputBlankId);ok(b&&!open,'overlapping or missing rip');
   size(o,b);ok(same(o.materialRect,b.rect),'start series geometry');
   ok(b.node.kind==='cut'&&o.materialAxis===b.node.axis&&o.primary===b.primary,'series root/axis');
   const expected=[];let n=b.node;
   while(n.kind==='cut'&&n.axis===o.materialAxis&&!['leading-trim','trailing-trim'].includes(n.phase)){expected.push(n.number);n=n.edgeFinish?null:n.second;if(!n)break;}
   ok(expected.length>0,'empty rip');open={id:o.seriesId,axis:o.materialAxis,primary:b.primary,sheet:b.sheet,expected,done:0,tail:o.inputBlankId,children:[]};continue;
  }
  if(o.type==='endRip'){
   ok(open&&o.seriesId===open.id&&open.done===open.expected.length,'premature series completion');
   ok(o.materialAxis===open.axis&&o.primary===open.primary&&o.remainderBlankId===open.tail,'series completion identity');
   const ids=[...open.children,...(open.tail?[open.tail]:[])];ok(JSON.stringify(ids)===JSON.stringify(o.outputBlankIds),'series output list');
   const lastId=open.tail||ids.at(-1),last=states.get(lastId);ok(o.inputBlankId===lastId&&o.turnCountBefore===last.local&&o.turnCountAfter===last.local,'completion cannot reset turns');size(o,last);ok(same(o.materialRect,last.rect),'end series geometry');
   if(open.tail){const b=states.get(open.tail),parts=contained(b.sheet,b.rect),v=open.axis==='V',span=v?b.rect.w:b.rect.h;
    ok(b.held&&b.lock===open.axis,'last blank not retained');
    if(parts.length){const extent=Math.max(...parts.map(a=>(v?a.x+a.w-b.rect.x:a.y+a.h-b.rect.y)));
     ok(span>=extent&&span-extent<=p.kerf,'last blank is oversized remainder, not a completed strip');
     if(open.primary)ok(parts.some(a=>span-(v?a.w:a.h)>=0&&span-(v?a.w:a.h)<=p.kerf),'last primary strip has no real anchor');
    }
    b.held=false;b.lock=null;b.primary=false;b.role=parts.length?'COMPLETED_STRIP':'WASTE';
   }
   if(!open.tail&&ids.length){const b=states.get(ids.at(-1));b.held=false;b.lock=null;b.role='COMPLETED_STRIP';}
   if(open.primary){ok(!closed.has(open.sheet),'duplicate primary completion');closed.add(open.sheet);
    for(const id of ids){const b=states.get(id);b.primary=false;const parts=contained(b.sheet,b.rect);if(parts.length)actualStrips.push({sheet:b.sheet,stripIndex:actualStrips.filter(s=>s.sheet===b.sheet).length+1,blankId:id,materialRect:b.rect,nominalSpan:open.axis==='V'?b.rect.w:b.rect.h});}
   }
   open=null;active=null;continue;
  }
  const id=o.inputBlankId,b=states.get(id);ok(b,'missing live blank '+id);
  if(o.type==='feed'){
   size(o,b);ok(same(o.materialRect,b.rect),'feed material rectangle');ok(o.feedMode===(b.held?'advance-in-place':'load-detached'),'feed mode');
   if(open)ok(id===open.tail,'processing a child before series completion');
   if(!b.held)for(const [bid,t]of states)ok(!(t.held&&(future.get(bid)||[]).some(s=>s>o.step)),'unfinished rip series');
   active=id;feeds++;continue;
  }
  ok(active===id,'blank not loaded');
  if(o.type==='rotate'){
   if(open)ok(open.done===0&&id===open.tail,'rotation during unfinished rip');
   ok(!b.held,'held remainder rotation');ok(!b.primary&&closed.has(b.sheet),'rotation before primary end');ok(b.local===0,'second physical rotation');
   const before=dims(b);ok(o.angle===90&&o.fromOrientation===b.q*90&&o.beforeSize.w===before.w&&o.beforeSize.h===before.h,'rotation before');
   b.q=(b.q+1)%4;b.local++;b.ancestry++;turns++;
   size({...o,machineOrientation:o.toOrientation},b);ok(o.afterSize.w===o.w&&o.afterSize.h===o.h&&same(o.materialRect,b.rect),'rotation after');
   ok(o.outputBlankIds.length===1&&o.outputBlankIds[0]===id&&o.turnCountBefore===0&&o.turnCountAfter===1,'rotation identity/counters');continue;
  }
  ok(o.type==='cut','unsupported operation '+o.type);size(o,b);ok(same(o.materialRect,b.rect),'cut material rectangle');ok(o.axis===b.axis,'fixed machine cut direction');ok(near(o.kerf,p.kerf),'blade width');
  const mv=o.axis==='V',d=dims(b),pos=mv?o.start.x:o.start.y;
  ok(mv?near(o.end.x,pos)&&near(o.start.y,0)&&near(o.end.y,d.h):near(o.end.y,pos)&&near(o.start.x,0)&&near(o.end.x,d.w),'full stroke');
  const axis=b.q%2?(o.axis==='V'?'H':'V'):o.axis,v=axis==='V',r=b.rect,span=v?r.w:r.h,reverse=v?(b.q===2||b.q===3):(b.q===1||b.q===2),offset=reverse?span-pos-p.kerf:pos,materialPos=(v?r.x:r.y)+offset;
  ok(o.materialAxis===axis&&near(o.materialPos,materialPos),'material coordinates');
  if(b.held)ok(b.lock===axis,'retained direction changed');
  const key=b.sheet+':'+o.geometryCutNumber,entry=nodes.get(key);ok(entry&&entry.n===b.node&&!usedNodes.has(key)&&same(entry.r,r)&&entry.n.axis===axis&&near(entry.n.pos,materialPos),'replayed tree cut');usedNodes.add(key);
  const {a,c}= {a:entry.a,c:entry.b},edge=entry.edge;ok(o.edgeFinish===edge&&near(o.kerfUsed,Math.min(p.kerf,span-offset)),'replayed edge width');
  if(!edge)ok(pos>=0&&pos+p.kerf<=(mv?d.w:d.h),'blade outside blank');
  for(const a of contained(b.sheet,r)){const start=v?a.x:a.y,end=start+(v?a.w:a.h);ok(Math.max(start,materialPos)>=Math.min(end,materialPos+p.kerf)-1e-7,'cut crosses ordered part');}
  const leading=o.phase==='leading-trim',trailing=o.phase==='trailing-trim',trim=leading||trailing;
  if(trim){ok(!open,'trim inside declared rip');
   ok(leading?(near(v?r.x:r.y,0)&&near(materialPos,p.trim-p.kerf)&&!contained(b.sheet,a).length):
    (near(materialPos,(v?p.sheetW:p.sheetH)-p.trim)&&!contained(b.sheet,c).length),'fake edge preparation');
  }else{
   ok(open&&id===open.tail&&open.expected[open.done]===o.geometryCutNumber,'cut outside declared rip');
   const parts=contained(b.sheet,a);if(b.primary){ok(axis===b.axis&&b.q===0&&!edge,'primary direction');ok(parts.some(t=>near(v?t.w:t.h,v?a.w:a.h)),'no real primary strip anchor');}
   if(!b.primary)ok(closed.has(b.sheet),'secondary before primary end');
  }
  const ids=reverse&&!edge?o.outputBlankIds.slice().reverse():o.outputBlankIds;
  ok(ids.length===(edge?1:2)&&new Set(ids).size===ids.length,'output ids');
  if(edge){ok(!b.primary&&profile.allowTerminalBladeOverhang===true,'edge sizing only after primary rip');edgeFinishingCuts++;}
  ok(o.cutIndex===++cuts&&o.turnCount===b.local,'cut counters');const stage=b.stage+(axis===b.lastAxis?0:1);ok(o.stage===stage,'strip stage');stages=Math.max(stages,stage);cutLength+=mv?d.h:d.w;
  states.delete(id);active=null;const children=[];
  ids.forEach((child,i)=>{const held=edge||i===1||trim,primary=b.primary&&(i===1||trim),rect=i===0?a:c,local=edge?b.local:0;
   const t={...b,rect,q:b.q,local,parent:id,held,lock:held?axis:null,primary,stage,lastAxis:axis,role:primary?'HELD_SHEET':held?'HELD_STRIP':'DETACHED',node:i===0?entry.n.first:entry.n.second};
   add(child,t);children.push({id:child,rect,held,role:t.role});
   ok(o.outputTurnCounts[i]===local,'child turn reset');
  });
  if(!trim){open.done++;open.children.push(ids[0]);open.tail=edge?null:ids[1];}
  frames.push({step:o.step,cut:o.cutIndex,input:id,inputRole:b.role,axis,outputs:children});
 }
 ok(plan.primaryStrips.length===actualStrips.length&&plan.primaryStrips.every((a,i)=>{const b=actualStrips[i];return a.sheet===b.sheet&&a.stripIndex===b.stripIndex&&a.blankId===b.blankId&&same(a.materialRect,b.materialRect)&&near(a.nominalSpan,b.nominalSpan);}), 'primary strip metadata');
 ok(!open,'unclosed series');
 ok(loaded.size===layout.sheets.length&&closed.size===loaded.size&&usedNodes.size===nodes.size,'incomplete operations');
 ok(plan.outputs.length===states.size,'terminal output coverage');const finished=new Set();
 for(const o of plan.outputs){const b=states.get(o.blankId);ok(b&&same(b.rect,o.materialRect)&&o.machineOrientation===b.q*90&&o.turnCount===b.local&&o.parentBlankId===b.parent,'terminal state');
  if(o.kind==='part'){const key=o.part.id+':'+o.part.instance,a=allParts.find(a=>a.id===o.part.id&&a.instance===o.part.instance);ok(a&&!finished.has(key)&&b.sheet===a.sheet&&same(a,b.rect)&&!!a.rotated===!!o.part.rotated,'finished part');finished.add(key);partTurns.push({part:o.part,turns:b.ancestry});}
  else ok(o.kind==='waste'&&!contained(b.sheet,b.rect).length,'lost part in waste');
 }
 ok(finished.size===seenParts.size,'missing final parts');
 const remnants=wastes.map(r=>{const x=Math.max(r.x,useful.x),y=Math.max(r.y,useful.y);return Math.max(0,Math.min(r.x+r.w,useful.x+useful.w)-x)*Math.max(0,Math.min(r.y+r.h,useful.y+useful.h)-y);});
 return{geometryValid:true,abstractCutTreeValid:true,targetPSSModelValid:true,realMachineFeasibility:'unknown',errors:[],partTurns,roleFrames:frames,primarySnapshots:frames.filter(f=>f.inputRole==='HELD_SHEET'),
 metrics:{sheets:loaded.size,parts:finished.size,cuts,turns,feeds,cutLength,stages,operations:plan.operations.length,largestWaste:Math.max(0,...remnants),wasteArea:remnants.reduce((a,b)=>a+b,0),edgeFinishingCuts,heldRemainderTurns:0,originalSheetTurns:0,ancestryTurnsMax:Math.max(0,...partTurns.map(a=>a.turns))},
 assumptions:['Each sheet has a fixed initial loading direction H or V; retained HIGH material never rotates at any level.','Leading/trailing edges are prepared before each rip; the final working blank is released only after all declared cuts.','Edge sizing preserves the physical rotation counter; a subsequent cut is possible only after an explicit completed series.','Clamp, stroke, feed and trim-overhang capability of the actual machine are not confirmed.']};
}
module.exports={validateCompleted};
