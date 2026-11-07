import sys,json,time,subprocess,os,tempfile,numpy as np
import packingsolver.rectangleguillotine as ps
from scipy.optimize import linprog,milp,Bounds,LinearConstraint
from scipy.sparse import csc_matrix
from pathlib import Path
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
file=str(out/'column-pool.json')
stages=int(sys.argv[3]) if len(sys.argv)>3 else 2
rounds=int(sys.argv[4]) if len(sys.argv)>4 else 26
pricing_seconds=3 if stages==2 else 2
assert stages in (2,3) and rounds>0
pool=json.load(open(sys.argv[1]));json.dump(pool,open(file,'w'))
start=time.monotonic()
for iteration in range(rounds):
 pool=json.load(open(file));A=np.array([x['counts'] for x in pool['patterns']],dtype=float).T;q=np.array([g['q'] for g in pool['groups']],dtype=float);n=A.shape[1]
 lp=linprog(np.ones(n),A_eq=A,b_eq=q,bounds=(0,None),method='highs');prices=lp.eqlin.marginals
 print(json.dumps({'iteration':iteration,'patterns':n,'LP':lp.fun,'seconds':time.monotonic()-start}),flush=True)
 if (stages==2 and iteration%5==0) or (stages==3 and iteration==5) or iteration==rounds-1:
  r=milp(np.ones(n),integrality=np.ones(n),bounds=Bounds(np.zeros(n),np.full(n,np.inf)),constraints=[LinearConstraint(csc_matrix(A),q,q),LinearConstraint(csc_matrix(np.ones((1,n))),0,16)],options={'time_limit':15,'mip_rel_gap':0})
  print(json.dumps({'MIP':r.message,'sheets':r.fun}),flush=True)
  if r.x is not None:
   json.dump({'selection':[{'index':i,'copies':int(round(v))} for i,v in enumerate(r.x) if v>.5],'pool':file},open(str(out/'selection.json'),'w'));break
 d=tempfile.mkdtemp(prefix='retry-price-')
 for axis in ['V','H']:
  b=ps.InstanceBuilder();b.set_objective(ps.Objective.Knapsack);b.set_cut_thickness(pool["parameters"]["kerf"]);b.set_number_of_stages(stages);b.set_first_stage_orientation(ps.CutOrientation.Vertical if axis=='V' else ps.CutOrientation.Horizontal);b.set_cut_type(ps.CutType.NonExact)
  t={}
  for side in ['left','right','top','bottom']:t[side+'_trim']=pool['parameters']['trim'];t[side+'_trim_type']=ps.TrimType.Hard
  b.add_bin_type(pool["parameters"]["sheetW"],pool["parameters"]["sheetH"],copies=1,trims=t)
  for g,price in zip(pool['groups'],prices):b.add_item_type(g['l'],g['w'],copies=g['q'],profit=max(0,price)+1e-7,oriented=False)
  o=ps.OptimizeParameters();o.time_limit=pricing_seconds;o.verbosity_level=0;o.memory_limit_megabytes=512;o.optimization_mode=ps.OptimizationMode.Anytime
  count=[0]
  def save(out):
   if out.solution.feasible() and out.solution.number_of_bins()==1:
    count[0]+=1;out.solution.write(d+'/'+axis+str(count[0])+'.csv')
  o.new_solution_callback=save;save(ps.optimize(b.build(),o))
 s=subprocess.run(['node',str(Path(__file__).with_name('admit.cjs')),file,d],capture_output=True,text=True,check=True);print(s.stdout.strip(),flush=True)
