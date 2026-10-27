$ErrorActionPreference = 'Stop'
$trazoPidFile = Join-Path $PSScriptRoot 'data/servidor.pid'
if (-not (Test-Path -LiteralPath $trazoPidFile)) { Write-Host 'Trazo no tiene un proceso iniciado por este acceso directo.'; exit 0 }
$trazoIdentity = Get-Content -LiteralPath $trazoPidFile -Raw | ConvertFrom-Json
if (-not $trazoIdentity.id -or -not $trazoIdentity.started -or $trazoIdentity.app -ne $PSScriptRoot) { throw 'El registro del proceso es de una versión anterior. Vuelve a iniciar Trazo.' }
$trazoProcess = Get-Process -Id ([int]$trazoIdentity.id) -ErrorAction SilentlyContinue
if ($trazoProcess -and $trazoProcess.ProcessName -eq 'python' -and $trazoProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $trazoIdentity.started) {
    Stop-Process -Id $trazoProcess.Id
    Write-Host 'Trazo detenido. Los trabajos pendientes se recuperan al iniciarlo de nuevo.'
} elseif ($trazoProcess) {
    throw 'El proceso guardado no corresponde a esta app. No se ha detenido ningún otro programa.'
} else {
    Write-Host 'Trazo ya estaba detenido.'
}

