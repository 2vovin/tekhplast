'use strict';
// Requires the separately installed xlsx@0.18.5 writer; no closed BAZIS format is generated.
function buildWorkbook(p,XLSX){
 if(!Array.isArray(p.pieces)||p.pieces.some(a=>!Number.isFinite(a.l)||!Number.isFinite(a.w)||a.l<=0||a.w<=0||!Number.isSafeInteger(a.q)||a.q<1))throw Error('Invalid numeric order');
 const wb=XLSX.utils.book_new(),rows=p.pieces.map(a=>[a.l,a.w,a.q]);
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Детали');
 const rotations=p.pieces.every(a=>a.grain===false)?'Разрешены для всех деталей':p.pieces.every(a=>a.grain!==false)?'Запрещены для всех деталей':'Задать отдельно для каждой позиции';
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
 ['Параметр','Значение'],['Длина листа, мм',p.sheetW],['Ширина листа, мм',p.sheetH],['Пропил, мм',p.kerf],['Обрезка каждого края, мм',p.trim],
 ['Повороты деталей',rotations],['Количество строк',p.pieces.length],['Количество экземпляров',p.pieces.reduce((s,a)=>s+a.q,0)],
 ['Площадь деталей, м²',p.pieces.reduce((s,a)=>s+a.l*a.w*a.q,0)/1e6],
 ['Назначение','Справочный лист: параметры нужно установить в БАЗИС отдельно'],
 ['Статус','Список деталей для импорта; готовые карты БАЗИС этим файлом не переносятся']
 ]),'Параметры');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['№','Длина, мм','Ширина, мм','Количество','Поворот разрешён'],...p.pieces.map(a=>[a.id,a.l,a.w,a.q,a.grain===false?'Да':'Нет'])]),'Контроль');
 return wb;
}
function textRows(p){return p.pieces.map(a=>[a.l,a.w,a.q].map(n=>String(n).replace('.',',')).join('\t')).join('\r\n')+'\r\n';}
module.exports={buildWorkbook,textRows};
if(require.main===module){
 const XLSX=require('xlsx'),fs=require('node:fs'),path=require('node:path'),p=require('../input.json');
 const wb=buildWorkbook(p,XLSX),expected=p.pieces.map(a=>[a.l,a.w,a.q]);
 for(const[extension,bookType]of [['xls','biff8'],['xlsx','xlsx']]){
  const bytes=XLSX.write(wb,{type:'buffer',bookType,compression:true});
  const reread=XLSX.read(bytes,{type:'buffer',raw:true}),actual=XLSX.utils.sheet_to_json(reread.Sheets['Детали'],{header:1,raw:true});
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Spreadsheet roundtrip mismatch: '+extension);
  fs.writeFileSync(path.join(__dirname,'listpro-234-bazis.'+extension),bytes);
 }
 fs.writeFileSync(path.join(__dirname,'parts-ru.txt'),textRows(p),'utf8');
 console.log(JSON.stringify({rows:expected.length,parts:p.pieces.reduce((s,a)=>s+a.q,0),writer:XLSX.version,importIntoBASISPerformed:false}));
}
