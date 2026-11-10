#!/usr/bin/env bash
# Infrastructure checks only. Never contacts Supabase or changes .env.local.
set -euo pipefail
agenda_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
export CRED_QUIET=1
source "$agenda_root/scripts/activate.sh"
[[ "$(node -p 'process.versions.node' | tr -d '\r\n')" == "$(tr -d '\r\n' < .node-version)" ]]
[[ "$(command -v node)" == "$agenda_root/.runtime/node/node" || "$(command -v node)" == "$agenda_root/.runtime/node/node.exe" ]]
[[ "$npm_config_cache" == "$(cygpath -am "$agenda_root/.npm-cache")" ]]
for agenda_script in "$agenda_root"/scripts/*.sh; do bash -n "$agenda_script"; done
if bash "$agenda_root/scripts/activate.sh" >/dev/null 2>&1; then
  printf '%s\n' 'activate.sh debe requerir source.' >&2
  exit 1
fi
printf '%s\n' 'Git Bash: sintaxis, Node local y cache local correctos.'
