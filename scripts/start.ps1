$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'activate.ps1')
if (-not (Test-Path -LiteralPath (Join-Path $AgendaRoot 'node_modules'))) {
    throw 'Faltan dependencias. Ejecuta .\scripts\setup.ps1.'
}
& (Join-Path $AgendaNodeDirectory 'npm.cmd') run dev -- --port 5173 --strictPort
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el servidor local.' }
