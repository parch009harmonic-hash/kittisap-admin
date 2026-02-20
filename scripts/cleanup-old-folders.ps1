$ErrorActionPreference = "Stop"

$root = "E:\kittisap-admin"
$targets = @(
  "kittisap-admin",
  "kittisap-admin-clean",
  "kittisap-admin-main"
)

foreach ($name in $targets) {
  $path = Join-Path $root $name
  if (Test-Path $path) {
    Write-Host "Removing $path"
    Remove-Item -LiteralPath $path -Recurse -Force
  } else {
    Write-Host "Skip (not found): $path"
  }
}

Write-Host "Cleanup completed."
