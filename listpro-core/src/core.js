'use strict';
// STARTER: simple deterministic guillotine shelf packer. Intentionally NOT a high-quality optimizer.
// All dimensions in millimetres. This implementation is for research only.
function checkInput(p) {
  if (!p || !Number.isFinite(p.sheetW) || !Number.isFinite(p.sheetH) ||
      !Number.isFinite(p.kerf) || !Number.isFinite(p.trim) ||
      p.sheetW <= 0 || p.sheetH <= 0 || p.kerf < 0 || p.trim < 0 ||
      !Array.isArray(p.pieces)) throw Error('Invalid sheet or list');
  const w=p.sheetW-2*p.trim, h=p.sheetH-2*p.trim;
  if(w<=0||h<=0) throw Error('No cutting area');
  const jobs=[];
  for(const [rowIndex,part] of p.pieces.entries()){
    if(!Number.isFinite(part.l)||!Number.isFinite(part.w)||
       part.l<=0||part.w<=0||!Number.isSafeInteger(part.q)||part.q<1)
      throw Error('Invalid part');
    for(let i=0;i<part.q;i++) jobs.push({id:part.id??rowIndex+1,instance:i+1,
      l:part.l,w:part.w,grain:part.grain!==false,name:part.name||''});
  }
  return {w,h,jobs};
}
function leaf(rect, kind='waste', part=null){return {kind,rect,part};}
function cut(rect,axis,pos,kerf,left,right){
  return {kind:'cut',rect,axis,pos,kerf,first:left,second:right};
}
function makeRowTree(row, x0, y0, W, k){
  // Built from right to left so every vertical cut splits the CURRENT piece.
  let subtree=null;
  for(let i=row.parts.length-1;i>=0;i--){
    const item=row.parts[i], width=W-(item.x-x0), r={x:item.x,y:y0,w:width,h:row.h};
    const partRect={x:item.x,y:y0,w:item.w,h:item.h};
    const partNode=leaf(partRect,'part',{id:item.id,instance:item.instance,rotated:item.rotated});
    let block=partNode;
    if(row.h-item.h>=k){
      const bottom={x:item.x,y:y0+item.h+k,w:item.w,h:row.h-item.h-k};
      block=cut({x:item.x,y:y0,w:item.w,h:row.h},'H',y0+item.h,k,partNode,leaf(bottom));
    }
    if(subtree){
      block=cut(r,'V',item.x+item.w,k,block,subtree);
    } else {
      const rem=width-item.w;
      if(rem>=k)block=cut(r,'V',item.x+item.w,k,block,
        leaf({x:item.x+item.w+k,y:y0,w:rem-k,h:row.h}));
    }
    subtree=block;
  }
  return subtree;
}
function pack(problem){
  const {w:W,h:H,jobs}=checkInput(problem),k=problem.kerf,t=problem.trim;
  const sorted=jobs.slice().sort((a,b)=>Math.max(b.l,b.w)-Math.max(a.l,a.w));
  const sheets=[];
  function newSheet(){return {rows:[],parts:[],height:0};}
  for(const job of sorted){
    let choice=null;
    // Choose a pre-existing row only if the height fits and the width/kerf permit.
    for(let si=0;si<sheets.length;si++){
      const sheet=sheets[si];
      for(let ri=0;ri<sheet.rows.length;ri++){
        const row=sheet.rows[ri];
        for(const candidate of [{w:job.l,h:job.w,rotated:false},
                                ...(job.grain?[]:[{w:job.w,h:job.l,rotated:true}])]){
          const nextX=row.width+(row.parts.length?k:0);
          if(candidate.h<=row.h && nextX+candidate.w<=W &&
             (row.h-candidate.h===0||row.h-candidate.h>=k) &&
             ((W-nextX-candidate.w)===0||W-nextX-candidate.w>=k)){
            const waste=W-(nextX+candidate.w);
            if(!choice||waste<choice.waste)
              choice={si,ri,candidate,waste,nextX};
          }
        }
      }
    }
    if(!choice){
      for(let si=0;si<=sheets.length;si++){
        const sh=si===sheets.length?newSheet():sheets[si];
        for(const candidate of [{w:job.l,h:job.w,rotated:false},
                         ...(job.grain?[]:[{w:job.w,h:job.l,rotated:true}])]){
          const startY=sh.height+(sh.rows.length?k:0);
          if(candidate.w<=W&&candidate.h<=H-startY &&
             ((H-startY-candidate.h)===0||H-startY-candidate.h>=k) &&
             ((W-candidate.w)===0||W-candidate.w>=k)){
            choice={si,ri:sh.rows.length,candidate,nextX:0,waste:W-candidate.w};
            break;
          }
        }
        if(choice)break;
      }
    }
    if(!choice)throw Error('Part does not fit');
    if(choice.si===sheets.length)sheets.push(newSheet());
    const sh=sheets[choice.si];
    if(choice.ri===sh.rows.length){
      const y=t+sh.height+(sh.rows.length?k:0);
      sh.rows.push({y,h:choice.candidate.h,width:0,parts:[]});
      sh.height=y-t+choice.candidate.h;
    }
    const row=sh.rows[choice.ri], x=t+choice.nextX;
    const part={id:job.id,instance:job.instance,name:job.name,x,y:row.y,
      w:choice.candidate.w,h:choice.candidate.h,rotated:choice.candidate.rotated};
    row.parts.push(part);row.width=choice.nextX+part.w;sh.parts.push(part);
  }
  for(const sh of sheets){
    let body=null;
    for(let i=sh.rows.length-1;i>=0;i--){
      const row=sh.rows[i], y=row.y, rr={x:t,y,w:W,h:H-(y-t)};
      const rowTree=makeRowTree(row,t,y,W,k);
      if(body)body=cut(rr,'H',y+row.h,k,rowTree,body);
      else {
        const remaining=H-(y-t)-row.h;
        body=remaining>=k?cut(rr,'H',y+row.h,k,rowTree,
          leaf({x:t,y:y+row.h+k,w:W,h:remaining-k})):rowTree;
      }
    }
    sh.tree=body;
  }
  return {sheets:sheets.map(s=>({parts:s.parts,tree:s.tree})),
    partCount:jobs.length,method:'starter-guillotine-shelf',optimality:'not proven'};
}
module.exports={pack,checkInput};
