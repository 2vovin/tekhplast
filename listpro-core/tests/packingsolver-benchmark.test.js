'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {instance,checkCertificate,PIN}=require('../src/packingsolver-benchmark');
const p={sheetW:100,sheetH:100,trim:10,kerf:5,pieces:[{id:'a',l:30,w:20,q:2,grain:true}]};
const header='PLATE_ID,COPIES,NODE_ID,X,Y,WIDTH,HEIGHT,TYPE,CUT,PARENT\n';
const csv=header+'0,1,0,0,0,100,100,0,0,\n0,1,1,10,10,30,20,0,1,0\n0,1,2,45,10,30,20,0,1,0\n';
test('PackingSolver adapter preserves exact order/kerf/hard trims',()=>{
 const i=instance(p);assert.equal(i.cut_thickness,5);assert.equal(i.number_of_stages,'unlimited');assert.equal(i.bin_types[0].left_trim,10);
 assert.deepEqual(i.item_types,[{width:30,height:20,copies:2,oriented:true}]);assert.equal(PIN.sha256.length,64);
});
test('external geometric check never implies a physical PSS certificate',()=>{
 const v=checkCertificate(p,csv);assert.equal(v.parts,2);assert.equal(v.sheets,1);assert.equal(v.abstractCutPlanValid,null);assert.equal(v.machineFeasibility,'unknown');
});
for(const [name,bad] of [
 ['overlap',csv.replace('45,10,30,20','30,10,30,20')],
 ['kerf',csv.replace('45,10,30,20','43,10,30,20')],
 ['grain',csv.replace('45,10,30,20','45,10,20,30')],
 ['trim',csv.replace('45,10,30,20','45,5,30,20')],
 ['quantities',csv.replace('0,1,2,45,10,30,20,0,1,0\n','')],
 ['duplicate ID',csv.replace('0,1,2,45','0,1,1,45')]
])test('external certificate rejects '+name,()=>assert.throws(()=>checkCertificate(p,bad)));
