$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root 'frontend'
$Logs = Join-Path $Root 'logs'
$Log = Join-Path $Logs 'frontend.log'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
Add-Content $Log "[watch] frontend watcher online $(Get-Date -Format s)"
Push-Location $Frontend
try {
  while ($true) {
    Add-Content $Log "[watch] starting frontend $(Get-Date -Format s)"
    try {
      & npm.cmd run dev *>> $Log 2>&1
    } catch {
      Add-Content $Log "[watch] frontend error: $_"
    }
    Add-Content $Log "[watch] frontend exited, restarting in 3s $(Get-Date -Format s)"
    Start-Sleep -Seconds 3
  }
} finally {
  Pop-Location
}