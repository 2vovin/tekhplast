'use strict';
const {artifacts}=require('./recursive-strip-artifacts');
const {validateAncestryTurns}=require('./ancestry-validator');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function exportTechnology(s){
 const a=validateAncestryTurns(s.parameters,s,s.plan,s.technologyProfile);
 const old=artifacts(s),files={};
 for(const [name,text] of Object.entries(old))files[name.replaceAll('brain2','brain21')]=text.replaceAll('Brain 2.0','Brain 2.1');
 files['verification.json']=JSON.stringify(a,null,2)+'\n';
 const max=Math.max(...a.blanks.map(b=>b.level)),levels=[];
 for(let level=0;level<=max;level++){
  // Level entry blanks partition the relevant material: don't overlay every
  // intermediate blank of a parallel rip on the same overview.
  const entries=a.blanks.filter(b=>b.level===level&&(!b.parentBlankId||a.blanks.find(p=>p.blankId===b.parentBlankId)?.level!==level));
  for(let sheet=0;sheet<s.sheets.length;sheet++){
   const blanks=entries.filter(b=>b.sheet===sheet);if(!blanks.length)continue;
   const body=blanks.map((b,i)=>{
    const r=b.materialRect;
    return '<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="hsl('+((i*71)%360)+' 60% 85%)" stroke="#334155" stroke-width="3"/><text x="'+(r.x+4)+'" y="'+(r.y+18)+'" font-size="16">'+esc((i+1)+': '+r.w+'×'+r.h+'; entry turns '+b.rotationSteps.filter(step=>step<b.createdAt).length)+'</text>';
   }).join('');
   const name='levels/sheet-'+(sheet+1)+'-level-'+level+'.svg';
   files[name]='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -65 '+(s.parameters.sheetW+20)+' '+(s.parameters.sheetH+85)+'"><title>Brain 2.1 level '+level+'</title><text x="10" y="-25" font-size="28">Sheet '+(sheet+1)+' · strip level '+level+' · machine UNKNOWN</text><rect width="'+s.parameters.sheetW+'" height="'+s.parameters.sheetH+'" fill="#f8fafc"/>'+body+'</svg>\n';
   levels.push({sheet,level,file:name,blanks:blanks.map((b,i)=>({label:i+1,...b,entryAncestryTurns:b.rotationSteps.filter(step=>step<b.createdAt).length}))});
  }
 }
 files['levels/index.json']=JSON.stringify({definition:a.semantics.level,levels},null,2)+'\n';
 const table=(headers,rows)=>'<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 files['levels.html']='<!doctype html><meta charset="utf-8"><title>Brain 2.1 strip levels</title><style>body{font:16px system-ui;margin:24px}svg{width:100%;max-height:600px}li{overflow-wrap:anywhere}</style><h1>Blank entry maps by strip level</h1><p>'+esc(a.semantics.level)+'. Coordinates retain the material grain direction. Machine compatibility UNKNOWN.</p>'+levels.map(level=>'<section><h2>Sheet '+(level.sheet+1)+' / level '+level.level+'</h2>'+files[level.file]+'<ol>'+level.blanks.map(b=>'<li>'+esc(b.blankId)+'; '+b.materialRect.w+'×'+b.materialRect.h+'; created at step '+b.createdAt+'; initial orientation '+b.initialMachineOrientation+'°; path turns at entry '+b.entryAncestryTurns+'</li>').join('')+'</ol></section>').join('');
 files['ancestry.html']='<!doctype html><meta charset="utf-8"><title>Brain 2.1 ancestry</title><style>body{font:15px system-ui;padding:20px}td,th{border:1px solid #ccc;padding:6px}table{border-collapse:collapse}td{overflow-wrap:anywhere}</style><h1>Brain 2.1 · genealogy audit</h1><p>Profile '+esc(s.technologyProfile.id)+'; machine UNKNOWN. Initial load = 0 turns. Cut-level maps are a documented research interpretation, not a certified BAZIS postprocessor.</p>'+
 table(['Part','Blank','Local turns','Path turns','Strip level','Rotation steps'],a.parts.map(p=>[p.id+':'+p.instance,p.blankId,p.localTurns,p.ancestryTurns,p.level,p.rotationSteps.join(', ')]))+
 '<h2>Physical processing</h2>'+table(['Step','Operation','Blank','Strip level','Local turns','Path turns'],a.events.map(e=>[e.step,e.type,e.blankId,e.level,e.localTurns,e.ancestryTurns]))+
 '<h2>Stop register</h2>'+table(['Step','CUT','Axis','Distance mm','Changed','Setting no.'],a.settings.map(e=>[e.step,e.cutIndex,e.axis,e.value,e.changed,e.settingNumber]));
 files['operations.md']+='\n## Per-detail rotation chains\n\n|Part|Path turns|Strip level|ROTATE step numbers|\n|---|---:|---:|---|\n'+a.parts.map(p=>'|'+[p.id+':'+p.instance,p.ancestryTurns,p.level,p.rotationSteps.join(', ')].join('|')+'|').join('\n')+'\n';
 // Add genealogy beside every CUT in the physical movie; keep the independent
 // transformed machine-coordinate diagrams from the earlier exporter.
 let html=files['operations.html'];
 for(const event of a.events.filter(e=>e.type==='cut')){
  const cut=s.plan.operations.find(o=>o.step===event.step);
  const title='<h2>CUT '+cut.cutIndex+' — step '+event.step+'</h2>';
  html=html.replace(title,title+'<p>Strip processing level '+event.level+'; local turns '+event.localTurns+'; inherited path turns '+event.ancestryTurns+'.</p>');
 }
 files['operations.html']=html;
 files['result.json']=JSON.stringify(s,null,2)+'\n';
 return files;
}
module.exports={exportTechnology};