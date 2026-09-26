param(
  [switch]$Foreground
)
# start-dev.ps1 - launches persistent auto-restart watchers for backend + frontend
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Scripts = $PSScriptRoot
$Logs = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

$psArgs = '-NoProfile -ExecutionPolicy Bypass -File "{0}\watch-backend.ps1"'
$psFArgs = '-NoProfile -ExecutionPolicy Bypass -File "{0}\watch-frontend.ps1"'

if ($Foreground) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Scripts 'watch-backend.ps1')
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Scripts 'watch-frontend.ps1')
} else {
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList ($psArgs -f $Scripts) | Out-Null
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList ($psFArgs -f $Scripts) | Out-Null
  Add-Content (Join-Path $Logs 'runner.log') "[start] watchers launched $(Get-Date -Format s)"
  Write-Output 'Backend + frontend watchers started (hidden). Logs in:'
  Write-Output (Join-Path $Logs 'backend.log')
  Write-Output (Join-Path $Logs 'frontend.log')
}