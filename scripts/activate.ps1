$ErrorActionPreference = 'Stop'
$AgendaRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$AgendaNodeDirectory = Join-Path $AgendaRoot '.runtime\node'
$AgendaNodeExecutable = Join-Path $AgendaNodeDirectory 'node.exe'
if (-not (Test-Path -LiteralPath $AgendaNodeExecutable)) {
    throw 'Falta el runtime aislado. Ejecuta primero .\scripts\setup.ps1.'
}
$AgendaRequiredVersion = (Get-Content -LiteralPath (Join-Path $AgendaRoot '.node-version') -Raw).Trim()
$AgendaActualVersion = (& $AgendaNodeExecutable -p 'process.versions.node').Trim()
if ($AgendaActualVersion -ne $AgendaRequiredVersion) { throw 'La version del runtime no coincide con .node-version.' }
$env:Path = "$AgendaNodeDirectory;$env:Path"
$env:npm_config_cache = Join-Path $AgendaRoot '.npm-cache'
$env:npm_config_prefix = Join-Path $AgendaRoot '.runtime\npm-global'
Set-Location -LiteralPath $AgendaRoot
Write-Host "AgendaCRED activo: $AgendaRoot (Node $AgendaActualVersion)"
Write-Host 'El entorno afecta solo esta consola. Cierrala para salir.'
