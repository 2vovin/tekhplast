const fs=require('fs'),B=require('path').resolve(__dirname,'../../..')+'/',{convert}=require(B+'src/packing-pss'),{fromTree}=require(B+'src/deferred-strip-patterns');
const file=process.argv[2],dir=process.argv[3],pool=JSON.parse(fs.readFileSync(file)),seen=new Set(pool.patterns.map(p=>p.counts.join(',')));let accepted=0,rejected=0;
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.csv'))){
try{
const lines=fs.readFileSync(dir+'/'+f,'utf8').trim().split('\n'),counts=pool.groups.map(()=>0),rows=lines.slice(1).map(l=>l.split(','));
for(const r of rows)if(+r[7]>=0&&+r[8]>0)counts[+r[7]]+=+r[1];if(seen.has(counts.join(',')))continue;
const active=pool.groups.filter(g=>counts[g.index]),mapping=new Map(active.map((g,i)=>[g.index,i]));
for(const r of rows)if(+r[7]>=0&&+r[8]>0)r[7]=mapping.get(+r[7]);
const p={...pool.parameters,pieces:active.map(g=>({id:g.index+1,l:g.l,w:g.w,q:counts[g.index],grain:false}))};
const result=convert(p,lines[0]+'\n'+rows.map(r=>r.join(',')).join('\n'),{axis:f.startsWith('V')?'V':'H'});if(result.sheets.length!==1)throw Error('not single sheet');
const pattern=fromTree(result.sheets[0].tree,p.kerf);pool.patterns.push({counts,pattern});seen.add(counts.join(','));accepted++;
}catch(e){rejected++;}
}
fs.writeFileSync(file,JSON.stringify(pool));console.log(JSON.stringify({accepted,rejected,patterns:pool.patterns.length}));
