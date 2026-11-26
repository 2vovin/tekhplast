'use strict';
// Dependency-free vector PDF, ASCII labels preserve portability with base PDF fonts.
// All dimensions/identifiers are numeric; the Russian tables are in maps.html.
function renderPDF(p,r){
 const objects=[],add=s=>(objects.push(s),objects.length),number=n=>Number(n.toFixed(3)).toString();
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const pages=add(''),catalog=add('<< /Type /Catalog /Pages '+pages+' 0 R >>'),pageIds=[];
 const colors=[[.745,.863,.973],[.776,.918,.843],[.882,.835,.976],[1,.886,.667],[.965,.804,.867],[.722,.906,.929]];
 const escape=s=>String(s).replace(/[()\\]/g,'\\$&');
 for(let i=0;i<r.sheets.length;i++){
  const sh=r.sheets[i],cmd=[],text=(s,x,y,size=8,angle=0)=>{cmd.push('0.08 0.15 0.22 rg BT /F1 '+number(size)+' Tf '+(angle?'0 1 -1 0 ':'1 0 0 1 ')+number(x)+' '+number(y)+' Tm ('+escape(s)+') Tj ET');};
  const W=841.89,H=595.28,scale=Math.min(638/p.sheetW,450/p.sheetH),X=28,Y=58;
  text('ListPro - Sheet '+(i+1)+' / '+r.sheets.length,20,H-24,13);
  text(p.sheetW+' x '+p.sheetH+' mm | Kerf '+p.kerf+' mm | Trim '+p.trim+' mm on each edge | '+sh.parts.length+' parts',20,H-41,9);
  const area=sh.parts.reduce((s,a)=>s+a.w*a.h,0);text('Sheet utilization '+(area/(p.sheetW*p.sheetH)*100).toFixed(2)+'%',20,H-55,8);
  cmd.push('.95 .96 .97 rg .2 .3 .4 RG .5 w '+[X,Y,p.sheetW*scale,p.sheetH*scale].map(number).join(' ')+' re B');
  const center=(s,x,y,size=8)=>text(s,x-String(s).length*size*.26,y,size);
  center(p.sheetW+' mm',X+p.sheetW*scale/2,Y+p.sheetH*scale+9);
  text(p.sheetH+' mm',X-10,Y+p.sheetH*scale/2,8,90);
  for(const a of sh.parts){
   const x=X+a.x*scale,y=Y+(p.sheetH-a.y-a.h)*scale,w=a.w*scale,h=a.h*scale,c=colors[(Number(a.id)-1)%colors.length];
   cmd.push(c.map(number).join(' ')+' rg .35 .46 .55 RG .3 w '+[x,y,w,h].map(number).join(' ')+' re B');
   center(a.id,x+w/2,y+h/2-2,Math.max(4,Math.min(9,h*.6,w/(String(a.id).length*.7+1))));
   if(Math.min(a.w,a.h)>=160){center(a.w,x+w/2,y+h-6,5);text(a.h,x+6,y+h/2-6,5,90);}
  }
  const counts=new Map();for(const a of sh.parts)counts.set(a.id,(counts.get(a.id)||0)+1);
  const tx=689,ty=H-80,rows=[...counts].sort((a,b)=>a[0]-b[0]),lh=Math.min(14,435/(rows.length+2));
  text('Part',tx,ty,9);text('Size, mm',tx+28,ty,9);text('Qty',tx+115,ty,9);
  for(let j=0;j<rows.length;j++){const[id,q]=rows[j],a=p.pieces.find(b=>b.id===id),y=ty-(j+1)*lh;text(id,tx,y,8);text(a.l+' x '+a.w,tx+28,y,8);text(q,tx+120,y,8);}
  text('PSS model: completed-rip-v1. Part rotation: forbidden. Actual machine compatibility: UNKNOWN.',20,27,8);
  text('Part numbers refer to original source rows. Cut/rotation sequence: operations.csv and sequence.html.',20,15,8);
  const stream=cmd.join('\n')+'\n',content=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
  pageIds.push(add('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+font+' 0 R >> >> /Contents '+content+' 0 R >>'));
 }
 objects[pages-1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let data='%PDF-1.4\n',offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(data.length);data+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=data.length;data+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
 data+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return data;
}
module.exports={renderPDF};
if(require.main===module){const fs=require('node:fs'),path=require('node:path');fs.writeFileSync(path.join(__dirname,'maps.pdf'),renderPDF(require('./input.json'),require('./result.json')),'ascii');}
