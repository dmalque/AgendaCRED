[CmdletBinding()]
param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem) {
    throw 'Este instalador portable requiere Windows x64. En otros sistemas usa Node y npm ci.'
}
$AgendaRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$AgendaRuntime = Join-Path $AgendaRoot '.runtime'
$AgendaVersion = (Get-Content -LiteralPath (Join-Path $AgendaRoot '.node-version') -Raw).Trim()
if ($AgendaVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Version de Node invalida.' }
$AgendaNodeDirectory = Join-Path $AgendaRuntime 'node'
$AgendaNodeExecutable = Join-Path $AgendaNodeDirectory 'node.exe'
if (-not (Test-Path -LiteralPath $AgendaNodeExecutable)) {
    if (Test-Path -LiteralPath $AgendaNodeDirectory) { throw 'Runtime incompleto: revisar .runtime\node antes de continuar.' }
    New-Item -ItemType Directory -Path $AgendaRuntime -Force | Out-Null
    $AgendaFileName = "node-v$AgendaVersion-win-x64.zip"
    $AgendaArchive = Join-Path $AgendaRuntime $AgendaFileName
    $AgendaBaseUrl = "https://nodejs.org/dist/v$AgendaVersion"
    Write-Host "Descargando Node $AgendaVersion desde nodejs.org..."
    Invoke-WebRequest -UseBasicParsing -Uri "$AgendaBaseUrl/$AgendaFileName" -OutFile $AgendaArchive
    $AgendaChecksums = (Invoke-WebRequest -UseBasicParsing -Uri "$AgendaBaseUrl/SHASUMS256.txt").Content
    if ($AgendaChecksums -is [byte[]]) { $AgendaChecksums = [Text.Encoding]::UTF8.GetString($AgendaChecksums) }
    $AgendaExpectedHash = $null
    foreach ($AgendaLine in ($AgendaChecksums -split '\r?\n')) {
        $AgendaParts = $AgendaLine.Trim() -split '\s+'
        if ($AgendaParts.Length -eq 2 -and $AgendaParts[1] -eq $AgendaFileName) { $AgendaExpectedHash = $AgendaParts[0] }
    }
    if (-not $AgendaExpectedHash) { throw 'No se encontro SHA256 oficial para la descarga.' }
    if ((Get-FileHash -LiteralPath $AgendaArchive -Algorithm SHA256).Hash -ne $AgendaExpectedHash) {
        throw 'La descarga no coincide con el SHA256 oficial. No se ejecutara.'
    }
    $AgendaExpanded = Join-Path $AgendaRuntime "node-v$AgendaVersion-win-x64"
    if (Test-Path -LiteralPath $AgendaExpanded) { throw 'Ya existe una extraccion parcial. Revisala antes de reintentar.' }
    Expand-Archive -LiteralPath $AgendaArchive -DestinationPath $AgendaRuntime
    # Rename a verified, known child within .runtime; no recursive deletion or cross-shell operation.
    Rename-Item -LiteralPath $AgendaExpanded -NewName 'node'
}
. (Join-Path $PSScriptRoot 'activate.ps1')
if (-not (Test-Path -LiteralPath (Join-Path $AgendaRoot '.env.local'))) {
    Copy-Item -LiteralPath (Join-Path $AgendaRoot '.env.example') -Destination (Join-Path $AgendaRoot '.env.local')
    Write-Host 'Se creo .env.local con placeholders. Configura Supabase para habilitar el login.'
}
if (-not $SkipInstall) {
    & (Join-Path $AgendaNodeDirectory 'npm.cmd') ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci fallo. Revisa la conexion y ejecuta setup.ps1 nuevamente.' }
}
Write-Host 'Entorno preparado. Inicia con .\scripts\start.ps1'
