#!/usr/bin/env bash
set -euo pipefail
[[ ${EUID} -eq 0 ]] || { echo 'Run from the root server console.'; exit 1; }
[[ $(uname -m) == x86_64 ]] || { echo 'This pinned wheel supports x86_64 only.'; exit 1; }
python3 -c 'import sys; assert sys.version_info >= (3,12), "Python 3.12+ required"'
if ! python3 -c 'import ensurepip' >/dev/null 2>&1; then
 apt-get update -qq
 apt-get install -y --no-install-recommends python3-venv
fi
PACKING_PIN_DIR=$(cd "$(dirname "$0")/../packing" && pwd)
python3 - "$PACKING_PIN_DIR/pin.json" <<'PY'
import hashlib, json, pathlib, subprocess, sys, tempfile, urllib.request
pin=json.loads(pathlib.Path(sys.argv[1]).read_text())
root=pathlib.Path('/opt/listpro/packing')
if root.exists() and not (root/'.managed-by-listpro').exists():
    raise SystemExit('Existing /opt/listpro/packing is not managed by ListPro')
root.mkdir(parents=True,exist_ok=True)
(root/'.managed-by-listpro').touch()
subprocess.run([sys.executable,'-m','venv',str(root)],check=True)
with tempfile.TemporaryDirectory(prefix='listpro-packing-install-') as temp:
    wheel=pathlib.Path(temp)/pin['filename']
    with urllib.request.urlopen(pin['url'],timeout=90) as response:
        data=response.read(16*1024*1024+1)
    if len(data)>16*1024*1024 or hashlib.sha256(data).hexdigest()!=pin['sha256']:
        raise SystemExit('PackingSolver wheel checksum mismatch; installation stopped')
    wheel.write_bytes(data)
    subprocess.run([str(root/'bin/python'),'-m','pip','install','--no-index','--no-deps',str(wheel)],check=True)
subprocess.run([str(root/'bin/python'),'-c',"import packingsolver.rectangleguillotine; import importlib.metadata; print('PackingSolver',importlib.metadata.version('packingsolver'),'ready')"],check=True)
PY
chmod -R a+rX /opt/listpro/packing
printf 'ListPro will use the native engine for subsequent jobs. HTTPS settings are unchanged.\n'
