#!/usr/bin/env bash
set -euo pipefail
agenda_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
export CRED_QUIET=1
source "$agenda_root/scripts/activate.sh"
agenda_npm=("$agenda_root/.runtime/node/node.exe" "$agenda_root/.runtime/node/node_modules/npm/bin/npm-cli.js")
"${agenda_npm[@]}" run format:check
"${agenda_npm[@]}" test
"${agenda_npm[@]}" run build
