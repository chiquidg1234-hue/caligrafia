param([string]$WebRoot, [string]$OutputPath, [switch]$Bootstrap)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$toolchainRoot = Join-Path $projectRoot 'work/trazo-android/toolchain'
$signingRoot = Join-Path $projectRoot 'work/trazo-android/signing'
if ($Bootstrap) { & (Join-Path $PSScriptRoot 'setup-toolchain.ps1') -ToolchainRoot $toolchainRoot }
if (-not $WebRoot) { $WebRoot = Join-Path $PSScriptRoot '../web' }
$WebRoot = [IO.Path]::GetFullPath($WebRoot)
if (-not (Test-Path -LiteralPath (Join-Path $WebRoot 'index.html'))) { throw "Falta index.html en $WebRoot" }
if (-not $OutputPath) { $OutputPath = Join-Path $PSScriptRoot '../Trazo4.apk' }
$OutputPath = [IO.Path]::GetFullPath($OutputPath)
$jdkRoot = Join-Path $toolchainRoot 'jdk/jdk-17.0.20.1+1'
$java = Join-Path $jdkRoot 'bin/java.exe'
$javac = Join-Path $jdkRoot 'bin/javac.exe'
$jar = Join-Path $jdkRoot 'bin/jar.exe'
$keytool = Join-Path $jdkRoot 'bin/keytool.exe'
$tools = Join-Path $toolchainRoot 'build-tools/android-16'
$platformJar = Join-Path $toolchainRoot 'platform/android-36/android.jar'
$aapt = Join-Path $tools 'aapt2.exe'
$zipalign = Join-Path $tools 'zipalign.exe'
$d8 = Join-Path $tools 'lib/d8.jar'
$apksigner = Join-Path $tools 'lib/apksigner.jar'
foreach ($required in @($java, $javac, $jar, $keytool, $platformJar, $aapt, $zipalign, $d8, $apksigner)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Falta herramienta $required. Ejecuta setup-toolchain.ps1 o usa -Bootstrap." }
}
function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Error $LASTEXITCODE en $([IO.Path]::GetFileName($Program))" }
}
# A new build folder makes repeated builds safe and avoids deleting shared state.
$buildRoot = Join-Path $toolchainRoot ('build/' + [guid]::NewGuid().ToString('N'))
$classes = Join-Path $buildRoot 'classes'
$generated = Join-Path $buildRoot 'generated'
$assetRoot = Join-Path $buildRoot 'assets'
$webAssets = Join-Path $assetRoot 'web'
$dexRoot = Join-Path $buildRoot 'dex'
New-Item -ItemType Directory -Force -Path $classes,$generated,$webAssets,$dexRoot,$signingRoot,([IO.Path]::GetDirectoryName($OutputPath)) | Out-Null
Get-ChildItem -LiteralPath $WebRoot -Force | Copy-Item -Destination $webAssets -Recurse -Force
$compiled = Join-Path $buildRoot 'resources.zip'
$unsigned = Join-Path $buildRoot 'unsigned.apk'
$aligned = Join-Path $buildRoot 'aligned.apk'
Invoke-Checked $aapt @('compile','--dir',(Join-Path $PSScriptRoot 'res'),'-o',$compiled)
Invoke-Checked $aapt @('link','-o',$unsigned,'--manifest',(Join-Path $PSScriptRoot 'AndroidManifest.xml'),'-I',$platformJar,'-A',$assetRoot,'--java',$generated,$compiled)
$javaFiles = @((Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src'),$generated -Filter '*.java' -Recurse).FullName)
$javacArgs = @('--release','8','-encoding','UTF-8','-classpath',$platformJar,'-d',$classes) + $javaFiles
Invoke-Checked $javac $javacArgs
$classJar = Join-Path $buildRoot 'classes.jar'
Invoke-Checked $jar @('cf',$classJar,'-C',$classes,'.')
Invoke-Checked $java @('-cp',$d8,'com.android.tools.r8.D8','--release','--min-api','26','--lib',$platformJar,'--output',$dexRoot,$classJar)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($unsigned, [IO.Compression.ZipArchiveMode]::Update)
try {
    foreach ($dex in (Get-ChildItem -LiteralPath $dexRoot -Filter '*.dex')) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $dex.FullName, $dex.Name, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    # aapt2 on this Windows host emits backslashes in asset entry names.
    # Android AssetManager uses forward slashes, so normalize entries before signing.
    $windowsEntries = @($archive.Entries | Where-Object { $_.FullName.Contains('\') })
    foreach ($entry in $windowsEntries) {
        $fixedName = $entry.FullName.Replace('\','/')
        if ($null -ne $archive.GetEntry($fixedName)) { throw "Recurso duplicado al normalizar: $fixedName" }
        $memory = New-Object IO.MemoryStream
        $original = $entry.Open()
        try { $original.CopyTo($memory) } finally { $original.Dispose() }
        $fixed = $archive.CreateEntry($fixedName, [IO.Compression.CompressionLevel]::Optimal)
        $stream = $fixed.Open()
        try { $memory.Position = 0; $memory.CopyTo($stream) } finally { $stream.Dispose(); $memory.Dispose() }
        $entry.Delete()
    }
} finally { $archive.Dispose() }
Invoke-Checked $zipalign @('-p','-f','4',$unsigned,$aligned)
$keystore = Join-Path $signingRoot 'trazo2-release.p12'
$passwordPath = Join-Path $signingRoot 'keystore-password.txt'
if (-not (Test-Path -LiteralPath $keystore)) {
    if (-not (Test-Path -LiteralPath $passwordPath)) {
        $secret = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($secret) } finally { $rng.Dispose() }
        $pass = [BitConverter]::ToString($secret).Replace('-','').ToLowerInvariant()
        [IO.File]::WriteAllText($passwordPath, $pass, [Text.Encoding]::ASCII)
    }
    Invoke-Checked $keytool @('-genkeypair','-noprompt','-keystore',$keystore,'-storetype','PKCS12','-alias','trazo2','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Trazo 2, OU=Offline, O=Trazo, C=BO','-storepass:file',$passwordPath,'-keypass:file',$passwordPath)
}
Invoke-Checked $java @('-jar',$apksigner,'sign','--ks',$keystore,'--ks-key-alias','trazo2','--ks-pass',('file:'+$passwordPath),'--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--v4-signing-enabled','false','--out',$OutputPath,$aligned)
$verification = & $java '-jar' $apksigner 'verify' '--verbose' '--print-certs' $OutputPath 2>&1
if ($LASTEXITCODE -ne 0) { throw "La firma del APK no pasó la verificación: $verification" }
$verification | Set-Content -Encoding utf8 -LiteralPath (Join-Path $buildRoot 'signature-verification.txt')
Invoke-Checked $zipalign @('-c','-p','4',$OutputPath)
$badging = & (Join-Path $tools 'aapt.exe') 'dump' 'badging' $OutputPath 2>&1
if ($LASTEXITCODE -ne 0) { throw "No se pudo verificar el manifest empaquetado: $badging" }
$badging | Set-Content -Encoding utf8 -LiteralPath (Join-Path $buildRoot 'apk-badging.txt')
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputPath).Hash.ToLowerInvariant()
$assetHashes = @(Get-ChildItem -LiteralPath $WebRoot -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=$_.FullName.Substring($WebRoot.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()}
})
$report = [ordered]@{apk=$OutputPath;sha256=$hash;bytes=(Get-Item -LiteralPath $OutputPath).Length;package='app.trazo.offline';version='2.2.0';versionCode=20003;minSdk=26;targetSdk=36;buildFolder=$buildRoot;assets=$assetHashes;signatureVerified=$true;alignmentVerified=$true;androidDeviceTested=$false}
$report | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 -LiteralPath ($OutputPath + '.build.json')
"$hash  $([IO.Path]::GetFileName($OutputPath))" | Set-Content -Encoding ascii -LiteralPath ($OutputPath + '.sha256')
Write-Output "APK creado, alineado y firma verificada: $OutputPath"
Write-Output "SHA256: $hash"
Write-Output "Prueba en Android físico o emulador: aún no ejecutada por este script."




