"""Isolated native candidate generator. PSS admission happens independently in Node."""
import json, sys, resource, importlib.metadata
from pathlib import Path
pin = json.loads(Path(__file__).with_name('pin.json').read_text())
if importlib.metadata.version('packingsolver') != pin['version']:
    raise RuntimeError('Unpinned PackingSolver version')
request = json.loads(Path(sys.argv[1]).read_text())
seconds = request['seconds']
if not 0 < seconds <= 30:
    raise ValueError('Invalid native time budget')
resource.setrlimit(resource.RLIMIT_AS, (1024**3, 1024**3))
resource.setrlimit(resource.RLIMIT_CPU, (int(seconds)+5, int(seconds)+6))
import packingsolver.rectangleguillotine as ps
p = request['parameters']
b = ps.InstanceBuilder()
b.set_objective(ps.Objective.BinPackingWithLeftovers)
b.set_cut_thickness(p['kerf'])
b.set_number_of_stages(request['stages'])
b.set_first_stage_orientation(ps.CutOrientation.Horizontal if request['axis']=='H' else ps.CutOrientation.Vertical)
b.set_cut_type(ps.CutType.NonExact)
trims = {}
for side in ['left','right','top','bottom']:
    trims[side+'_trim'] = p['trim']
    trims[side+'_trim_type'] = ps.TrimType.Hard
b.add_bin_type(p['sheetW'],p['sheetH'],copies=sum(a['q'] for a in p['pieces']),trims=trims)
for a in p['pieces']:
    b.add_item_type(a['l'],a['w'],copies=a['q'],oriented=a.get('grain') is not False)
params=ps.OptimizeParameters()
params.verbosity_level=0
params.time_limit=seconds
params.memory_limit_megabytes=512
params.optimization_mode=ps.OptimizationMode.NotAnytimeSequential
out=ps.optimize(b.build(),params)
if not out.solution.full() or not out.solution.feasible():
    raise RuntimeError('Native solution incomplete or infeasible')
out.solution.write(sys.argv[2])
Path(sys.argv[3]).write_text(json.dumps(out.solution.to_json(),allow_nan=False))
