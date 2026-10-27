param([string]$ToolchainRoot)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
if (-not $ToolchainRoot) { $ToolchainRoot = Join-Path $projectRoot 'work/trazo-android/toolchain' }
$ToolchainRoot = [IO.Path]::GetFullPath($ToolchainRoot)
$downloadRoot = Join-Path $ToolchainRoot 'downloads'
New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
$locked = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'toolchain.lock.json') | ConvertFrom-Json
foreach ($property in $locked.PSObject.Properties) {
    $name = $property.Name
    $item = $property.Value
    $archive = Join-Path $downloadRoot ($name + '.zip')
    if (-not (Test-Path -LiteralPath $archive)) { Invoke-WebRequest -Uri $item.url -OutFile $archive }
    if ((Get-FileHash -Algorithm $item.algorithm -LiteralPath $archive).Hash -ne $item.hash) {
        throw "Checksum no coincide para $name. No se extrae ni ejecuta."
    }
    $destination = Join-Path $ToolchainRoot $item.folder
    if (-not (Test-Path -LiteralPath $destination)) { Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($archive, $destination) }
    Write-Output "$name $($item.version): checksum oficial correcto."
}
Write-Output "Herramientas portables listas en $ToolchainRoot. No se modificó PATH."

