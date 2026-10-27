param([string]$Apk, [string]$WebRoot)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$toolchain = Join-Path $projectRoot 'work/trazo-android/toolchain'
$jdk = Join-Path $toolchain 'jdk/jdk-17.0.20.1+1/bin'
$testRoot = Join-Path $toolchain 'tests'
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
& (Join-Path $jdk 'javac.exe') '--release' '8' '-encoding' 'UTF-8' '-d' $testRoot (Join-Path $PSScriptRoot 'src/app/trazo/offline/NativePolicy.java') (Join-Path $PSScriptRoot 'test/NativePolicyTest.java')
if ($LASTEXITCODE -ne 0) { throw 'Las pruebas nativas no compilaron.' }
& (Join-Path $jdk 'java.exe') '-cp' $testRoot 'app.trazo.offline.NativePolicyTest'
if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas nativas.' }
if (-not $Apk) { $Apk = Join-Path $PSScriptRoot '../Trazo4.apk' }
if (-not $WebRoot) { $WebRoot = Join-Path $PSScriptRoot '../web' }
$WebRoot = [IO.Path]::GetFullPath($WebRoot)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($Apk))
try {
    if ($null -eq $zip.GetEntry('classes.dex') -or $null -eq $zip.GetEntry('AndroidManifest.xml')) { throw 'APK sin DEX o manifest.' }
    $sourceFiles = @(Get-ChildItem -LiteralPath $WebRoot -File -Recurse)
    $assetEntries = @($zip.Entries | Where-Object { $_.FullName.StartsWith('assets/web/') -and -not $_.FullName.EndsWith('/') })
    if ($sourceFiles.Count -ne $assetEntries.Count) { throw "Número de recursos distinto: fuente=$($sourceFiles.Count), apk=$($assetEntries.Count)" }
    foreach ($file in $sourceFiles) {
        $relative = $file.FullName.Substring($WebRoot.Length+1).Replace('\','/')
        $entry = $zip.GetEntry('assets/web/' + $relative)
        if ($null -eq $entry) { throw "Recurso no empaquetado: $relative" }
        $stream = $entry.Open()
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') } finally { $stream.Dispose(); $sha.Dispose() }
        if ($actual -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash) { throw "APK contiene una versión distinta de $relative" }
    }
    Write-Output "APK: todos los $($sourceFiles.Count) recursos web coinciden byte por byte con las fuentes."
} finally { $zip.Dispose() }
$tools = Join-Path $toolchain 'build-tools/android-16'
& (Join-Path $jdk 'java.exe') '-jar' (Join-Path $tools 'lib/apksigner.jar') 'verify' '--verbose' '--print-certs' $Apk
if ($LASTEXITCODE -ne 0) { throw 'Firma no válida.' }
& (Join-Path $tools 'zipalign.exe') '-c' '-p' '4' $Apk
if ($LASTEXITCODE -ne 0) { throw 'APK sin alinear.' }
$permissions = & (Join-Path $tools 'aapt.exe') 'dump' 'permissions' $Apk
if ($LASTEXITCODE -ne 0) { throw 'No se pudo inspeccionar permisos.' }
if (($permissions | Out-String) -match 'uses-permission:') { throw "Se esperaba APK sin permisos de red, cámara ni acceso general a almacenamiento: $permissions" }
Write-Output 'Manifest: no solicita permisos de red, cámara ni almacenamiento general.'
Write-Output 'Instalación y comportamiento en Android: requieren dispositivo/emulador; estas comprobaciones no lo sustituyen.'

