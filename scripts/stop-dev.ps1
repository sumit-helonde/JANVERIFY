# stop-dev.ps1 - stops watchers and the dev servers they manage
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot

$targets = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  ($_.Name -eq 'powershell.exe' -and ($_.CommandLine -match 'watch-backend\.ps1' -or $_.CommandLine -match 'watch-frontend\.ps1')) -or
  ($_.CommandLine -match 'uvicorn app\.main') -or
  ($_.CommandLine -match 'vite\.js|vite\b') -or
  ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'frontend.*node_modules')
}

foreach ($p in $targets) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
}
$Logs = Join-Path $Root 'logs'
Add-Content (Join-Path $Logs 'runner.log') "[stop] stopped dev processes $(Get-Date -Format s)"
Write-Output 'Stopped dev watchers and servers.'