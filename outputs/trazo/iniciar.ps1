param([switch]$SinAbrir)
$ErrorActionPreference = 'Stop'
$trazoRoot = $PSScriptRoot
$trazoPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$trazoAddress = 'http://127.0.0.1:8767'
$trazoReady = $false
try {
    $trazoPage = Invoke-WebRequest -UseBasicParsing -Uri $trazoAddress -TimeoutSec 2
    $trazoReady = ($trazoPage.StatusCode -eq 200 -and $trazoPage.Content -match '<title>Trazo')
} catch {}
if (-not $trazoReady) {
    if (-not (Test-Path -LiteralPath $trazoPython)) {
        throw 'No se encuentra el Python de Codex. Consulta LEEME.md para iniciar con otro Python.'
    }
    New-Item -ItemType Directory -Path (Join-Path $trazoRoot 'data') -Force | Out-Null
    $trazoArgs = @(('"' + (Join-Path $trazoRoot 'server.py') + '"'), '--port', '8767')
    $trazoProcess = Start-Process -FilePath $trazoPython -ArgumentList $trazoArgs -WorkingDirectory $trazoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $trazoRoot 'data/servidor.log') -RedirectStandardError (Join-Path $trazoRoot 'data/errores.log') -PassThru
    @{ id=$trazoProcess.Id; started=$trazoProcess.StartTime.ToUniversalTime().Ticks.ToString(); app=$trazoRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $trazoRoot 'data/servidor.pid')
    for ($trazoAttempt = 0; $trazoAttempt -lt 30; $trazoAttempt++) {
        Start-Sleep -Milliseconds 300
        try { $trazoPage = Invoke-WebRequest -UseBasicParsing -Uri $trazoAddress -TimeoutSec 1; $trazoReady = ($trazoPage.StatusCode -eq 200 -and $trazoPage.Content -match '<title>Trazo'); if ($trazoReady) { break } } catch {}
    }
}
if (-not $trazoReady) { throw 'Trazo no pudo arrancar. Consulta data/errores.log.' }
if (-not $SinAbrir) { Start-Process $trazoAddress }

