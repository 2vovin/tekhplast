'use strict';
const fs=require('fs'),path=require('path'),{auditPatterns}=require('../src/reference-pattern-audit'),learning=require('../src/cutting-experience');
const [input,reference,output]=process.argv.slice(2);if(!output)throw Error('Usage: node scripts/audit-cutting-reference.js order.json reference.json new-output-directory');
if(fs.existsSync(output))throw Error('Use a new output directory to preserve prior audit files');
const p=JSON.parse(fs.readFileSync(input)),ref=JSON.parse(fs.readFileSync(reference)),r=auditPatterns(p,ref);fs.mkdirSync(output,{recursive:true});
let bank=learning.empty();
for(const {sourceSheet,result}of r.admitted){fs.writeFileSync(path.join(output,'validated-sheet-'+sourceSheet+'.json'),JSON.stringify(result));bank=learning.remember(bank,result.parameters,result);}
fs.writeFileSync(path.join(output,'validated-experience.json'),JSON.stringify(bank,null,2));
const report={...r,admitted:r.admitted.map(a=>({sourceSheet:a.sourceSheet,metrics:a.result.metrics})),sheets:r.sheets.map(({pattern,parts,...a})=>a)};
fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(report,null,2));
const colors=['#bfdbfe','#bbf7d0','#fde68a','#fecaca','#ddd6fe','#a5f3fc'];
for(const sh of r.sheets){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -90 ${p.sheetW} ${p.sheetH+90}"><rect width="${p.sheetW}" height="${p.sheetH}" fill="#eee"/><text x="10" y="-30" font-size="35">Лист ${sh.sourceSheet}: реконструкция геометрии; PSS ${sh.targetPSSModelValid?'проверен':'не подтверждён'}</text>`+sh.parts.map(a=>`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${colors[(a.id-1)%colors.length]}" stroke="#334155"/><text x="${a.x+a.w/2}" y="${a.y+a.h/2}" text-anchor="middle" font-size="22">${a.id}</text>`).join('')+'</svg>';fs.writeFileSync(path.join(output,`sheet-${sh.sourceSheet}-${sh.copy}.svg`),svg);}
console.log(JSON.stringify({sheets:r.sheets.length,parts:r.reconstructedGeometry.parts,pssAccepted:r.admitted.length,patterns:bank.patterns.length,fullOrderPSS:r.targetPSSModelValid}));
