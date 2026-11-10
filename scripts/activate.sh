#!/usr/bin/env bash
# Source this file only for manual npm commands; start.sh handles activation itself.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  printf '%s\n' 'Para iniciar: bash scripts/start.sh' 'Para comandos manuales: source scripts/activate.sh' >&2
  exit 1
fi

_cred_activate() {
  local agenda_root agenda_node_dir agenda_required agenda_actual
  agenda_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)" || return 1
  agenda_node_dir="$agenda_root/.runtime/node"
  if [[ ! -f "$agenda_node_dir/node.exe" ]]; then
    printf '%s\n' 'Falta Node del proyecto. Ejecuta: bash scripts/setup.sh' >&2
    return 1
  fi
  if ! command -v cygpath >/dev/null 2>&1; then
    printf '%s\n' 'Este entorno requiere Git Bash de Git for Windows.' >&2
    return 1
  fi
  agenda_required="$(tr -d '\r\n' < "$agenda_root/.node-version")" || return 1
  agenda_actual="$("$agenda_node_dir/node.exe" -p 'process.versions.node')" || return 1
  agenda_actual="${agenda_actual//$'\r'/}"
  if [[ "$agenda_actual" != "$agenda_required" ]]; then
    printf 'Version de Node incorrecta: %s; se requiere %s.\n' "$agenda_actual" "$agenda_required" >&2
    return 1
  fi
  if [[ "${PATH%%:*}" != "$agenda_node_dir" ]]; then
    export PATH="$agenda_node_dir:$PATH"
  fi
  export npm_config_cache="$(cygpath -am "$agenda_root/.npm-cache")"
  export npm_config_prefix="$(cygpath -am "$agenda_root/.runtime/npm-global")"
  hash -r
  cd -- "$agenda_root" || return 1
  if [[ "${CRED_QUIET:-0}" != '1' ]]; then
    printf 'AgendaCRED: Node %s local. Solo afecta esta terminal.\n' "$agenda_actual"
  fi
}

if _cred_activate; then
  unset -f _cred_activate
else
  unset -f _cred_activate
  return 1
fi
