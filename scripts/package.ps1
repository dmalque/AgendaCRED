[CmdletBinding()]
param([string]$Destination)
$ErrorActionPreference = 'Stop'
$AgendaRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$AgendaExports = Join-Path $AgendaRoot '.exports'
if (-not $Destination) {
    New-Item -ItemType Directory -Path $AgendaExports -Force | Out-Null
    $Destination = Join-Path $AgendaExports ('AgendaCRED-source-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip')
}
$Destination = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $Destination) { throw 'El archivo de destino ya existe. No se sobrescribira.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$AgendaIncludedFolders = @('src', 'public', 'supabase', 'scripts')
$AgendaIncludedFiles = @('package.json','package-lock.json','requirements.txt','README.md','tsconfig.json','vite.config.ts','vercel.json','index.html','.env.example','.gitignore','.node-version','.nvmrc')
$AgendaArchive = [IO.Compression.ZipFile]::Open($Destination, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($AgendaFolder in $AgendaIncludedFolders) {
        Get-ChildItem -LiteralPath (Join-Path $AgendaRoot $AgendaFolder) -Recurse -File | ForEach-Object {
            $AgendaRelative = $_.FullName.Substring($AgendaRoot.Length + 1).Replace('\','/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($AgendaArchive, $_.FullName, "AgendaCRED/$AgendaRelative") | Out-Null
        }
    }
    foreach ($AgendaFile in $AgendaIncludedFiles) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($AgendaArchive, (Join-Path $AgendaRoot $AgendaFile), "AgendaCRED/$AgendaFile") | Out-Null
    }
    Get-ChildItem -LiteralPath (Join-Path $AgendaRoot 'docs') -File -Filter '*.md' | ForEach-Object {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($AgendaArchive, $_.FullName, "AgendaCRED/docs/$($_.Name)") | Out-Null
    }
} finally { $AgendaArchive.Dispose() }
Write-Host "Paquete creado sin secretos, node_modules ni runtime: $Destination"
