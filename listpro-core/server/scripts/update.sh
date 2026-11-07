#!/usr/bin/env bash
set -euo pipefail
# Run from a downloaded source release. Optional second argument is an explicitly
# selected, independently verified customer result to import into experience.
[[ ${EUID} -eq 0 ]] || { echo 'Run from the root server console.'; exit 1; }
LISTPRO_PROJECT=$(cd "$(dirname "$0")/../.." && pwd)
LISTPRO_DOMAIN=${1:-listpro.shortsnews.org}
LISTPRO_VERIFIED_RESULT=${2:-}
[[ -f /opt/listpro/.managed-by-listpro ]] || { echo 'Use install.sh for the first installation.'; exit 1; }
if [[ -n "$LISTPRO_VERIFIED_RESULT" ]]; then
 [[ -f "$LISTPRO_VERIFIED_RESULT" && -r "$LISTPRO_VERIFIED_RESULT" ]] || { echo 'Verified result file not readable.'; exit 1; }
 command -v runuser >/dev/null
fi
bash "$LISTPRO_PROJECT/server/scripts/install-packing.sh"
bash "$LISTPRO_PROJECT/server/scripts/install.sh" "$LISTPRO_DOMAIN"
LISTPRO_IMPORT_TEMP=''
trap 'if [[ -n "$LISTPRO_IMPORT_TEMP" ]]; then rm -f -- "$LISTPRO_IMPORT_TEMP"; fi' EXIT
if [[ -n "$LISTPRO_VERIFIED_RESULT" ]]; then
 LISTPRO_IMPORT_TEMP=$(mktemp /var/lib/listpro/verified-import.XXXXXX.json)
 install -m 600 -o listpro-svc -g listpro-svc "$LISTPRO_VERIFIED_RESULT" "$LISTPRO_IMPORT_TEMP"
 runuser -u listpro-svc -- /opt/listpro/node/bin/node /opt/listpro/current/server/scripts/import-verified.cjs "$LISTPRO_IMPORT_TEMP"
 rm -f -- "$LISTPRO_IMPORT_TEMP"
 LISTPRO_IMPORT_TEMP=''
fi
curl -fsS http://127.0.0.1:3127/healthz
printf '\nListPro update complete. Existing site settings and experience retained.\n'
