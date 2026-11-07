#!/usr/bin/env bash
set -euo pipefail
# Installs only ListPro-owned paths. Does not replace the existing Node.js or sites.
[[ ${EUID} -eq 0 ]] || { echo 'Run from the root web console.'; exit 1; }
DOMAIN=${1:-listpro.shortsnews.org}
[[ "$DOMAIN" =~ ^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$ && "$DOMAIN" != *..* ]] || { echo 'Invalid domain'; exit 1; }
PROJECT=$(cd "$(dirname "$0")/../.." && pwd)
PREFIX=/opt/listpro
CONF="/etc/nginx/sites-available/listpro-${DOMAIN}.conf"
LINK="/etc/nginx/sites-enabled/listpro-${DOMAIN}.conf"
LISTPRO_EXISTING_SITE=false
[[ ! -f "$CONF" ]] || LISTPRO_EXISTING_SITE=true
for tool in curl tar xz sha256sum python3 nginx systemctl ss; do command -v "$tool" >/dev/null || { echo "Required tool missing: $tool"; exit 1; }; done
nginx -t
python3 - "$DOMAIN" "$CONF" <<'PY'
import pathlib,re,sys
name,owned=sys.argv[1:]
for folder in ['/etc/nginx/sites-enabled','/etc/nginx/conf.d']:
    for f in pathlib.Path(folder).glob('*'):
        if not f.is_file(): continue
        if f.resolve()==pathlib.Path(owned) and '# Managed by ListPro' in f.read_text(): continue
        text=re.sub(r'#.*','',f.read_text())
        if any(name in s.split() for s in re.findall(r'\bserver_name\s+([^;]+);',text)):
            raise SystemExit('This domain already belongs to another Nginx config; nothing changed.')
PY
if [[ -e "$PREFIX" && ! -f "$PREFIX/.managed-by-listpro" ]]; then echo 'Existing /opt/listpro is not managed by this installer; stopped.'; exit 1; fi
if [[ -f /etc/systemd/system/listpro.service ]] && ! grep -q '^# Managed by ListPro' /etc/systemd/system/listpro.service; then echo 'Existing foreign listpro.service; stopped.'; exit 1; fi
if [[ -e "$CONF" ]] && ! grep -q '^# Managed by ListPro' "$CONF"; then echo 'Existing foreign Nginx config; stopped.'; exit 1; fi
if [[ -e "$LINK" && "$(readlink -f "$LINK")" != "$CONF" ]]; then echo 'Existing foreign site link; stopped.'; exit 1; fi
if [[ -n "$(ss -ltnH 'sport = :3127')" ]] && ! systemctl is-active --quiet listpro.service; then echo 'Port 3127 is already used by another service; stopped.'; exit 1; fi
install -d -m 755 "$PREFIX" "$PREFIX/releases"
touch "$PREFIX/.managed-by-listpro"
install -d -m 700 "$PREFIX/admin"
install -m 700 "$PROJECT/server/scripts/enable-https.sh" "$PREFIX/admin/enable-https.sh"
NODE_VERSION=v22.23.4
case "$(uname -m)" in x86_64) ARCH=x64;; aarch64) ARCH=arm64;; *) echo 'Unsupported CPU architecture'; exit 1;; esac
NODE_DIR="$PREFIX/node-${NODE_VERSION}-linux-${ARCH}"
if [[ ! -x "$NODE_DIR/bin/node" ]]; then
  TMP=$(mktemp -d)
  trap 'rm -rf "$TMP"' EXIT
  FILE="node-${NODE_VERSION}-linux-${ARCH}.tar.xz"
  curl --proto '=https' --tlsv1.2 -fL --retry 2 "https://nodejs.org/dist/${NODE_VERSION}/${FILE}" -o "$TMP/$FILE"
  curl --proto '=https' --tlsv1.2 -fL --retry 2 "https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt" -o "$TMP/sums"
  awk -v file="$FILE" '$2==file {print}' "$TMP/sums" > "$TMP/check"
  [[ -s "$TMP/check" ]] || { echo 'Missing official checksum'; exit 1; }
  (cd "$TMP" && sha256sum -c check)
  tar -xJf "$TMP/$FILE" -C "$PREFIX"
fi
ln -sfn "$NODE_DIR" "$PREFIX/node"
if getent passwd listpro-svc >/dev/null; then
 [[ "$(getent passwd listpro-svc | cut -d: -f6)" == /var/lib/listpro ]] || { echo 'Existing foreign service user'; exit 1; }
else useradd --system --user-group --create-home --home-dir /var/lib/listpro --shell /usr/sbin/nologin listpro-svc; fi
install -d -m 700 -o listpro-svc -g listpro-svc /var/lib/listpro
install -d -m 700 /etc/listpro
if [[ ! -f /etc/listpro/listpro.env ]]; then python3 "$PROJECT/server/scripts/set-password.py" /etc/listpro/listpro.env; fi
RELEASE=$(mktemp -d "$PREFIX/releases/release-XXXXXX")
"$PREFIX/node/bin/node" "$PROJECT/server/scripts/stage.cjs" "$RELEASE"
chmod -R a+rX "$RELEASE"
OLD=$(readlink -f "$PREFIX/current" || true)
ln -sfn "$RELEASE" "$PREFIX/current"
cat > /etc/systemd/system/listpro.service <<'UNIT'
# Managed by ListPro
[Unit]
Description=ListPro calculation and experience service
After=network.target
[Service]
Type=simple
User=listpro-svc
Group=listpro-svc
WorkingDirectory=/opt/listpro/current
EnvironmentFile=/etc/listpro/listpro.env
ExecStart=/opt/listpro/node/bin/node --max-old-space-size=256 /opt/listpro/current/server/main.cjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=15
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/listpro
MemoryMax=1536M
CPUQuota=150%
Nice=5
UMask=0077
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable listpro.service
if ! systemctl restart listpro.service; then
 if [[ -n "$OLD" ]]; then ln -sfn "$OLD" "$PREFIX/current"; systemctl restart listpro.service; fi
 echo 'ListPro failed to start; existing Nginx sites were not changed.'; exit 1
fi
READY=false
for i in $(seq 1 15); do if curl -fsS http://127.0.0.1:3127/healthz | python3 -c 'import sys,json; x=json.load(sys.stdin); sys.exit(0 if x.get("service")=="listpro" and x.get("ok") else 1)' >/dev/null 2>&1; then READY=true; break; fi; sleep 1; done
[[ "$READY" == true ]] || { echo 'ListPro health check failed. Inspect: journalctl -u listpro --no-pager -n 30'; exit 1; }
# Existing site files remain untouched; only the new host is prepared for ACME.
install -d -m 755 /var/www/listpro-acme
if [[ ! -f "$CONF" ]]; then
 cat > "$CONF" <<EOF
# Managed by ListPro
server {
 listen 80;
 server_name $DOMAIN;
 location ^~ /.well-known/acme-challenge/ { root /var/www/listpro-acme; }
 location / { return 503; }
}
EOF
 ln -s "$CONF" "$LINK"
 if ! nginx -t; then rm -f "$LINK" "$CONF"; echo 'New config removed; existing sites unchanged.'; exit 1; fi
 systemctl reload nginx
fi
if [[ "$LISTPRO_EXISTING_SITE" == true ]]; then
 printf '\nListPro updated. Existing Nginx and HTTPS proxy configuration preserved.\n'
 printf 'Status: curl -fsS http://127.0.0.1:3127/healthz\n'
else
 printf '\nListPro is ready on loopback. HTTPS must be enabled before login.\n'
 printf 'Domain: %s\n' "$DOMAIN"
 printf 'Next: certbot certonly --webroot -w /var/www/listpro-acme -d %s\n' "$DOMAIN"
 printf 'Then: bash /opt/listpro/admin/enable-https.sh %s\n' "$DOMAIN"
fi
