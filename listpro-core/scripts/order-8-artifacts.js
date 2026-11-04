'use strict';
const fs=require('node:fs'),path=require('node:path'),{verifyDeferred}=require('../src/deferred-strip-search');
const dir=path.resolve(__dirname,'../benchmarks/order-8-sheets'),p=require(path.join(dir,'input.json')),r=require(path.join(dir,'best.json'));
const verified=verifyDeferred(p,r);fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({metrics:verified.metrics,profile:verified.equipmentProfile,geometryAndAbstractStagedValid:true,realMachineFeasibility:'unknown'},null,2));
for(const [i,s]of r.sheets.entries()){
 const color=['#bedcf8','#c6ead7','#e1d5f9','#ffe2aa','#f6cddd','#b8e7ed'];
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -100 2830 1980"><rect width="2750" height="1830" fill="#f0f2f4" stroke="#555"/><text y="-35" font-size="34">Лист '+(i+1)+' · '+s.parts.length+' деталей · 2750 × 1830 мм</text>'+s.parts.map(a=>'<g><rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="'+color[(a.id-1)%6]+'" stroke="#667"/><text x="'+(a.x+a.w/2)+'" y="'+(a.y+a.h/2)+'" text-anchor="middle" font-size="'+Math.min(25,a.h/3,a.w/5)+'">'+a.id+' · '+a.w+'×'+a.h+'</text></g>').join('')+'</svg>';
 fs.writeFileSync(path.join(dir,'sheet-'+(i+1)+'.svg'),svg);
}
console.log(verified.metrics);
