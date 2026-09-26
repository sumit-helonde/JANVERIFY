$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$Logs = Join-Path $Root 'logs'
$Log = Join-Path $Logs 'backend.log'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$Python = Join-Path $Backend '.venv\Scripts\python.exe'
Add-Content $Log "[watch] backend watcher online $(Get-Date -Format s)"
Push-Location $Backend
try {
  while ($true) {
    if (Test-Path $Python) {
      $ok = $true
    } else {
      $ok = $false
    }
    Add-Content $Log "[watch] starting backend $(Get-Date -Format s)"
    try {
      if ($ok) {
        & $Python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload *>> $Log 2>&1
      }
    } catch {
      Add-Content $Log "[watch] backend error: $_"
    }
    Add-Content $Log "[watch] backend exited, restarting in 2s $(Get-Date -Format s)"
    Start-Sleep -Seconds 2
  }
} finally {
  Pop-Location
}