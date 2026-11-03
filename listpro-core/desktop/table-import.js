'use strict';
(function(root){
 function parseTable(text,grain=false){
  const pieces=[];
  for(const [i,line]of String(text).split(/\r?\n/).entries()){
   const raw=line.trim();if(!raw||/^[\s|:-]+$/.test(raw))continue;
   const cells=raw.replace(/^\||\|$/g,'').trim().split(/[|;\t]+|\s+/).map(x=>x.trim()).filter(Boolean);
   if(!pieces.length&&/длин|length/i.test(raw)&&/шир|width/i.test(raw))continue;
   if(cells.length!==3)throw Error('Строка '+(i+1)+': нужны длина, ширина, количество.');
   if(cells.some(x=>!/^\d+(?:[.,]\d+)?$/.test(x)))throw Error('Строка '+(i+1)+': некорректное число.');
   const [l,w,q]=cells.map(x=>Number(x.replace(',','.')));
   if(l<=0||w<=0||!Number.isSafeInteger(q)||q<1)throw Error('Строка '+(i+1)+': проверьте размеры и целое количество.');
   pieces.push({id:pieces.length+1,l,w,q,grain,name:''});
  }
  if(!pieces.length)throw Error('Таблица пуста.');
  if(pieces.length>500||pieces.reduce((n,a)=>n+a.q,0)>2500)throw Error('Максимум 500 строк и 2500 экземпляров.');
  return pieces;
 }
 if(typeof module==='object'&&module.exports)module.exports={parseTable};
 else root.ListProTableImport={parseTable};
})(globalThis);
