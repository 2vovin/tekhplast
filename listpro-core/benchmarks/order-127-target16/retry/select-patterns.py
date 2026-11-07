import sys,json,time
from ortools.sat.python import cp_model
from pathlib import Path
pool=json.load(open(sys.argv[1]));A=[v['counts'] for v in pool['patterns']];groups=pool['groups'];n=len(A);mode=sys.argv[2];t=time.monotonic();m=cp_model.CpModel()
assert mode in ('exact','cover','maxcover')
x=[]
for j,a in enumerate(A):
 upper=min(g['q']//a[i] for i,g in enumerate(groups) if a[i]);x.append(m.new_int_var(0,upper,'p'+str(j)))
for i,g in enumerate(groups):
 value=sum(a[i]*x[j] for j,a in enumerate(A) if a[i])
 m.add(value==g['q'] if mode=='exact' else value<=g['q'] if mode=='maxcover' else value>=g['q'])
m.add(sum(x)<=16)
if mode=='maxcover':
 area=[sum(a[i]*g['l']*g['w'] for i,g in enumerate(groups)) for a in A]
 m.maximize(sum(area[j]*x[j] for j in range(n)))
if len(sys.argv)>5:
 for var,value in zip(x,json.load(open(sys.argv[5]))):m.add_hint(var,value)
s=cp_model.CpSolver();s.parameters.max_time_in_seconds=float(sys.argv[3]) if len(sys.argv)>3 else 90;s.parameters.num_search_workers=int(sys.argv[4]) if len(sys.argv)>4 else 2;s.parameters.random_seed=20261107

class Progress(cp_model.CpSolverSolutionCallback):
 def on_solution_callback(self):
  if mode=='maxcover': print(json.dumps({'bestArea':self.objective_value,'seconds':time.monotonic()-t}),flush=True)
status=s.solve(m,Progress());ok=status in (cp_model.OPTIMAL,cp_model.FEASIBLE)
coverage=[sum(A[j][i]*s.value(x[j]) for j in range(n)) for i in range(len(groups))] if ok else None
out={'mode':mode,'coversEveryGroup':all(coverage[i]>=g['q'] for i,g in enumerate(groups)) if ok else False,'exactQuantities':all(coverage[i]==g['q'] for i,g in enumerate(groups)) if ok else False,'technologyChecked':False,'area':s.objective_value if mode=='maxcover' else None,'areaBound':s.best_objective_bound if mode=='maxcover' else None,'status':s.status_name(status),'seconds':time.monotonic()-t,'patterns':n,'sheets':int(sum(s.value(v) for v in x)) if ok else None,'selection':[{'index':j,'copies':int(s.value(v))} for j,v in enumerate(x) if s.value(v)] if ok else None}
json.dump(out,open(str(Path(sys.argv[1]).with_name('cp-'+mode+'-selection.json')),'w'));json.dump(pool,open(str(Path(sys.argv[1]).with_name('cp-'+mode+'-pool.json')),'w'));print(json.dumps(out),flush=True)
