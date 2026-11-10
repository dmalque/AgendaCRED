#!/usr/bin/env bash
set -euo pipefail
agenda_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
export CRED_QUIET=1
source "$agenda_root/scripts/activate.sh"
[[ -d "$agenda_root/node_modules" ]] || { printf '%s\n' 'Faltan dependencias. Ejecuta: bash scripts/setup.sh' >&2; exit 1; }
exec "$agenda_root/.runtime/node/node.exe" "$agenda_root/.runtime/node/node_modules/npm/bin/npm-cli.js" run dev -- --port "${PORT:-5173}" --strictPort "$@"
