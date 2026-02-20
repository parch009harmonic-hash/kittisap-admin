$ErrorActionPreference = "Stop"

param(
  [string]$Branch = "master",
  [string]$Message = ""
)

if (-not (Test-Path ".git")) {
  throw "Run this script from the repository root."
}

Write-Host "[1/4] Build check..."
npm run build
if ($LASTEXITCODE -ne 0) {
  throw "Build failed. Sync aborted."
}

Write-Host "[2/4] Stage changes..."
git add -A

$pending = git status --porcelain
if (-not $pending) {
  Write-Host "No changes to commit."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "chore: sync " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

Write-Host "[3/4] Commit..."
git commit -m $Message

Write-Host "[4/4] Push..."
git push origin $Branch

Write-Host "GitHub sync completed."
