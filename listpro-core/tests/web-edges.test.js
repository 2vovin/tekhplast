'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),edges=require('../web/edge-banding');
test('edge bands: missing and invalid values do not create bands',()=>{
 assert.deepEqual(edges.normalize(),{top:0,right:0,bottom:0,left:0});
 assert.deepEqual(edges.normalize({top:'0.4',left:-1,right:'<script>',bottom:9}),{top:.4,right:0,bottom:0,left:0});
});
test('edge bands: independent asymmetric sides follow clockwise part rotation',()=>{
 const r={x:10,y:20,w:300,h:500};
 const s=edges.segments(r,{top:.4,right:.8,bottom:1,left:2},1);
 assert.deepEqual(s.map(a=>[a.source,a.side,a.thickness]),[['top','right',.4],['right','bottom',.8],['bottom','left',1],['left','top',2]]);
 assert.deepEqual(s[0].points,[302,28,302,512]);
 assert.deepEqual(s[3].points,[18,28,302,28]);
});
test('edge bands: physical blank turns compose with the part rotation and stay inside narrow pieces',()=>{
 const r={x:0,y:0,w:4,h:20},e={top:2};
 assert.equal(edges.segments(r,e,2)[0].side,'bottom');
 assert.equal(edges.segments(r,e,4)[0].side,'top');
 const [x0,y0,x1,y1]=edges.segments(r,e)[0].points;assert(x0>=0&&x1<=4&&y0>=0&&y1<=20);
 assert.deepEqual(r,{x:0,y:0,w:4,h:20});assert.deepEqual(e,{top:2});
});
test('edge underline counts represent sides, independent of thickness',()=>{
 assert.deepEqual(edges.counts({top:2}),{l:1,w:0});
 assert.deepEqual(edges.counts({top:.4,bottom:2,right:.8}),{l:2,w:1});
 assert.deepEqual(edges.counts({left:1,right:2}),{l:0,w:2});
});
test('quick edge choice cycles zero, one, two, zero without changing other sides',()=>{
 const start={left:.8};const one=edges.cycle(start,'l',2),two=edges.cycle(one,'l',2),zero=edges.cycle(two,'l',2);
 assert.deepEqual(edges.counts(one),{l:1,w:1});assert.equal(one.top,2);
 assert.deepEqual(edges.counts(two),{l:2,w:1});assert.equal(two.bottom,2);
 assert.deepEqual(edges.counts(zero),{l:0,w:1});assert.equal(zero.left,.8);
 assert.deepEqual(edges.cycle({bottom:.4},'l',1),{top:1,right:0,bottom:.4,left:0});
});
