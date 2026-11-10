#!/usr/bin/env bash
set -euo pipefail

agenda_skip_install=0
case "${1:-}" in
  '') ;;
  --skip-install) agenda_skip_install=1 ;;
  *) printf '%s\n' 'Uso: bash scripts/setup.sh [--skip-install]' >&2; exit 1 ;;
esac
case "$(uname -s)" in
  MINGW*|MSYS*) ;;
  *) printf '%s\n' 'Este instalador utiliza Git Bash en Windows x64.' >&2; exit 1 ;;
esac
[[ "$(uname -m)" == 'x86_64' ]] || { printf '%s\n' 'Se requiere Windows x64.' >&2; exit 1; }
for agenda_command in curl unzip sha256sum awk cygpath; do
  command -v "$agenda_command" >/dev/null 2>&1 || { printf 'Falta %s. Revisa tu instalacion de Git Bash.\n' "$agenda_command" >&2; exit 1; }
done

agenda_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
agenda_version="$(tr -d '\r\n' < "$agenda_root/.node-version")"
[[ "$agenda_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { printf '%s\n' 'Version de Node invalida.' >&2; exit 1; }
agenda_runtime="$agenda_root/.runtime"
agenda_node_dir="$agenda_runtime/node"
[[ ! -L "$agenda_runtime" && ! -L "$agenda_node_dir" ]] || { printf '%s\n' 'El runtime debe ser una carpeta local, no un enlace.' >&2; exit 1; }

if [[ ! -f "$agenda_node_dir/node.exe" ]]; then
  [[ ! -e "$agenda_node_dir" ]] || { printf '%s\n' 'Runtime incompleto: revisa .runtime/node antes de reintentar.' >&2; exit 1; }
  mkdir -p -- "$agenda_runtime"
  agenda_filename="node-v$agenda_version-win-x64.zip"
  agenda_archive="$agenda_runtime/$agenda_filename"
  agenda_checksums="$agenda_runtime/SHASUMS256-$agenda_version.txt"
  agenda_url="https://nodejs.org/dist/v$agenda_version"
  if [[ ! -f "$agenda_archive" ]]; then
    printf 'Descargando Node %s desde nodejs.org...\n' "$agenda_version"
    curl --fail --location --retry 2 --connect-timeout 15 "$agenda_url/$agenda_filename" --output "$agenda_archive"
  fi
  if [[ ! -f "$agenda_checksums" ]]; then
    curl --fail --location --retry 2 --connect-timeout 15 "$agenda_url/SHASUMS256.txt" --output "$agenda_checksums"
  fi
  agenda_expected="$(awk -v filename="$agenda_filename" '$2 == filename { print $1 }' "$agenda_checksums")"
  [[ "$agenda_expected" =~ ^[[:xdigit:]]{64}$ ]] || { printf '%s\n' 'No se encontro el SHA256 oficial.' >&2; exit 1; }
  agenda_actual="$(sha256sum -- "$agenda_archive")"
  agenda_actual="${agenda_actual%% *}"
  [[ "${agenda_actual,,}" == "${agenda_expected,,}" ]] || { printf '%s\n' 'SHA256 incorrecto. No se ejecutara el archivo descargado.' >&2; exit 1; }
  agenda_expanded="$agenda_runtime/node-v$agenda_version-win-x64"
  [[ ! -e "$agenda_expanded" && ! -L "$agenda_expanded" ]] || { printf '%s\n' 'Ya existe una extraccion parcial. Revisala antes de reintentar.' >&2; exit 1; }
  unzip -q -- "$agenda_archive" -d "$agenda_runtime"
  # Both paths are fixed, verified children of this project's .runtime directory.
  [[ "$agenda_expanded" == "$agenda_root/.runtime/node-v$agenda_version-win-x64" && "$agenda_node_dir" == "$agenda_root/.runtime/node" ]] || exit 1
  mv -- "$agenda_expanded" "$agenda_node_dir"
fi

export CRED_QUIET=1
source "$agenda_root/scripts/activate.sh"
if [[ ! -e "$agenda_root/.env.local" ]]; then
  cp -- "$agenda_root/.env.example" "$agenda_root/.env.local"
  printf '%s\n' 'Se creo .env.local con valores de ejemplo. Configura Supabase para ingresar.'
fi
if [[ "$agenda_skip_install" == '0' ]]; then
  "$agenda_node_dir/node.exe" "$agenda_node_dir/node_modules/npm/bin/npm-cli.js" ci --no-audit --no-fund
fi
printf '%s\n' 'Preparacion completa. Para iniciar: bash scripts/start.sh'
