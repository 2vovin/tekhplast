#!/usr/bin/env bash
set -euo pipefail
[[ ${EUID} -eq 0 ]] || { echo 'Run as root'; exit 1; }
DOMAIN=${1:-listpro.shortsnews.org}
[[ "$DOMAIN" =~ ^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$ && "$DOMAIN" != *..* ]] || { echo 'Invalid domain'; exit 1; }
CONF="/etc/nginx/sites-available/listpro-${DOMAIN}.conf"
[[ -f "$CONF" ]] && grep -q '^# Managed by ListPro' "$CONF" || { echo 'Not a managed ListPro configuration'; exit 1; }
[[ -r "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && -r "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]] || { echo 'Issue the domain certificate first'; exit 1; }
ZONE="listpro_$(printf '%s' "$DOMAIN" | sha256sum | cut -c1-12)"
BACKUP=$(mktemp)
cp "$CONF" "$BACKUP"
cat > "$CONF" <<EOF
# Managed by ListPro
limit_req_zone \$binary_remote_addr zone=$ZONE:10m rate=5r/s;
server {
 listen 80;
 server_name $DOMAIN;
 location ^~ /.well-known/acme-challenge/ { root /var/www/listpro-acme; }
 location / { return 301 https://\$host\$request_uri; }
}
server {
 listen 443 ssl;
 server_name $DOMAIN;
 ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 client_max_body_size 256k;
 location / {
  limit_req zone=$ZONE burst=20 nodelay;
  proxy_pass http://127.0.0.1:3127;
  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-Proto \$scheme;
  proxy_read_timeout 30s;
  proxy_buffering off;
 }
}
EOF
if ! nginx -t; then cp "$BACKUP" "$CONF"; rm -f "$BACKUP"; echo 'Previous ListPro configuration restored'; exit 1; fi
systemctl reload nginx
rm -f "$BACKUP"
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
HOOK=/etc/letsencrypt/renewal-hooks/deploy/50-listpro-nginx
if [[ -e "$HOOK" ]] && ! grep -q '^# Managed by ListPro' "$HOOK"; then echo 'Foreign renewal hook exists; not replaced'; exit 1; fi
cat > "$HOOK" <<'EOF'
#!/bin/sh
# Managed by ListPro
/usr/sbin/nginx -t && /bin/systemctl reload nginx
EOF
chmod 755 "$HOOK"
printf 'Open https://%s — username: owner. Use the separate password set during installation.\n' "$DOMAIN"
