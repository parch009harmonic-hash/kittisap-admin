$ErrorActionPreference = "Stop"

param(
  [string]$Branch = "master",
  [string]$Message = ""
)

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw "Vercel CLI not found. Install with: npm i -g vercel"
}

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\sync-github.ps1" -Branch $Branch -Message $Message
if ($LASTEXITCODE -ne 0) {
  throw "GitHub sync failed. Release aborted."
}

Write-Host "Deploying to Vercel production..."
vercel deploy --prod
if ($LASTEXITCODE -ne 0) {
  throw "Vercel deploy failed."
}

Write-Host "Release completed."
