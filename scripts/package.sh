#!/usr/bin/env bash
set -euo pipefail
agenda_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
export CRED_QUIET=1
source "$agenda_root/scripts/activate.sh"
exec "$agenda_root/.runtime/node/node.exe" "$agenda_root/scripts/package.mjs" "$@"
