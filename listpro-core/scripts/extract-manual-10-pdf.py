import fitz,json,re,collections,math,argparse,hashlib
from pathlib import Path
a=argparse.ArgumentParser(description='Extract this manual 10-sheet PDF report; not a manufacturing-coordinate importer.');a.add_argument('pdf');a.add_argument('output');a.add_argument('--order',default=str(Path(__file__).resolve().parents[1]/'benchmarks/order-171/input.json'));args=a.parse_args()
D=fitz.open(args.pdf)
order=json.load(open(args.order))
allmaps=[]
for pi,page in enumerate(D):
 if pi>=5:break
 ds=page.get_drawings(); roots=[d['rect'] for d in ds if d['type']=='f' and d['fill'] and .8<d['fill'][0]<.9 and d['rect'].width>300]
 spans=[{'t':s['text'],'r':fitz.Rect(s['bbox'])} for b in page.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] if re.fullmatch(r'\d+',s['text'])]
 for root in roots:
  parts=[]
  for i,d in enumerate(ds):
   r=d['rect']
   if d['type']!='f' or d['fill']!=(1.,1.,1.) or not root.intersects(r) or not (root+(-.01,-.01,.01,.01)).contains(r):continue
   edges=ds[i+1:i+5]
   if len(edges)<4 or any(e['type']!='s' or len(e['items'])!=1 or e['items'][0][0]!='l' for e in edges):continue
   actual=fitz.Rect(min(e['rect'].x0 for e in edges),min(e['rect'].y0 for e in edges),max(e['rect'].x1 for e in edges),max(e['rect'].y1 for e in edges))
   if max(abs(a-b) for a,b in zip(actual,r))>.01:continue
   w=r.width/root.width*2730;h=r.height/root.height*1810
   candidates=[p['id'] for p in order['pieces'] if min(max(abs(w-p['l']),abs(h-p['w'])),max(abs(w-p['w']),abs(h-p['l'])))<8]
   cx=(r.x0+r.x1)/2;cy=(r.y0+r.y1)/2
   text=[s for s in spans if r.contains(fitz.Point((s['r'].x0+s['r'].x1)/2,(s['r'].y0+s['r'].y1)/2))]
   mid=[s for s in text if abs((s['r'].x0+s['r'].x1)/2-cx)<max(10,r.width*.3) and abs((s['r'].y0+s['r'].y1)/2-cy)<max(10,r.height*.3)]
   labels=[''.join(s['t'] for s in mid)]+[s['t'] for s in sorted(text,key=lambda s:((s['r'].x0+s['r'].x1)/2-cx)**2+((s['r'].y0+s['r'].y1)/2-cy)**2)]
   ids=[int(s) for s in labels if int(s) in candidates]
   id=ids[0] if ids else None
   parts.append({'id':id,'bbox':list(r),'approx':[round(w,2),round(h,2)],'xy':[(r.x0-root.x0)/root.width*2730,(r.y0-root.y0)/root.height*1810],'candidates':candidates,'labels':labels})
  allmaps.append({'sheet':len(allmaps)+1,'page':pi+1,'bbox':list(root),'parts':parts})

def groups(parts,axis):
 gr=[]
 for p in sorted(parts,key=lambda p:p['bbox'][axis]):
  lo,hi=p['bbox'][axis],p['bbox'][axis+2]
  if not gr or lo>gr[-1]['end']+.03:gr.append({'end':hi,'parts':[p]})
  else:gr[-1]['end']=max(gr[-1]['end'],hi);gr[-1]['parts'].append(p)
 return [g['parts'] for g in gr]
def topology(parts):
 if len(parts)==1:return {'id':parts[0]['id'],'bbox':parts[0]['bbox']}
 for axis in [1,0]:
  gs=groups(parts,axis)
  if len(gs)>1:
   ch=[topology(g) for g in gs]
   if all(ch):return {'axis':'H' if axis==1 else 'V','children':ch}
 return None
# Extract inventory separately from the diagram using the per-sheet table text.
text='\n'.join(p.get_text() for p in D)
chunks=re.split(r'Лист № \d+',text)[1:11]
if len(allmaps)!=10 or len(chunks)!=10:raise ValueError('Expected ten diagrams and inventories')
for m,c in zip(allmaps,chunks):
 m['topology']=topology(m['parts'])
 m['declaredParts']=int(re.search(r'Кол-во деталей:\s*(\d+)',c)[1]);m['copies']=int(re.search(r'Кол-во копий:\s*(\d+)',c)[1])
 size=re.search(r'Размер:\s*(\d+)x(\d+)',c);m['printedSize']=[int(size[1]),int(size[2])]
 m['printedKerf']=int(re.search(r'Ширина режущей части:\s*(\d+)',c)[1]);m['printedTrim']=[int(re.search(key+r'-(\d+)',c)[1]) for key in ['слева','справа','сверху','снизу']]
 m['printedCutLengthM']=float(re.search(r'Длина пропила:\s*([\d.]+)',c)[1])
 m['inventory']=[{'id':int(i),'l':int(l),'w':int(w),'q':int(q)} for i,l,w,q in re.findall(r'№\s*(\d+)\s+(\d+)x(\d+)\s*-\s*(\d+)',c)]
 for p in m['parts']:
  if p['id'] is None:raise ValueError('Unidentified diagram label on sheet '+str(m['sheet']))
  p.pop('candidates',None);p.pop('labels',None)
ref={'source':Path(args.pdf).name,'sha256':hashlib.sha256(Path(args.pdf).read_bytes()).hexdigest(),'pages':len(D),'units':{'bbox':'PDF points, approximate drawing only','approx':'approximate millimetres; NOT manufacturing dimensions','xy':'approximate millimetres; NOT verified coordinates'},'dimensionRounding':'awaiting confirmation','sheetSizeMeaning':'awaiting confirmation: likely usable area after 10mm border','sheets':allmaps}
Path(args.output).write_text(json.dumps(ref,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sheets':len(allmaps),'diagramParts':sum(len(s['parts']) for s in allmaps)}))
