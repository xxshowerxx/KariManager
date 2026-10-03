param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Push-Location $workspace
try {
  $package = Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $nativeConfig = Get-Content -LiteralPath (Join-Path $workspace 'src-tauri/tauri.conf.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($package.version -ne $nativeConfig.version) { throw 'Frontend and desktop versions do not match' }
  if (-not $SkipBuild) {
    npm run tauri -- build --no-bundle
    if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
  }
  $outputRoot = Join-Path $workspace 'release'
  $portableFolder = Join-Path $outputRoot "KariManager-v$($package.version)-windows-x64"
  New-Item -ItemType Directory -Force -Path $portableFolder | Out-Null
  Copy-Item -LiteralPath (Join-Path $workspace 'src-tauri/target/release/kari-manager.exe') -Destination (Join-Path $portableFolder 'KariManager.exe')
  Copy-Item -LiteralPath (Join-Path $workspace 'README.md') -Destination $portableFolder
  Copy-Item -LiteralPath (Join-Path $workspace 'LICENSE') -Destination $portableFolder
  Copy-Item -LiteralPath (Join-Path $workspace 'docs') -Destination $portableFolder -Recurse -Force
  $archive = "$portableFolder.zip"
  Compress-Archive -LiteralPath (Join-Path $portableFolder 'KariManager.exe'), (Join-Path $portableFolder 'README.md'), (Join-Path $portableFolder 'LICENSE'), (Join-Path $portableFolder 'docs') -DestinationPath $archive -Force
  $archiveStream = [System.IO.File]::OpenRead($archive)
  $hashEngine = [System.Security.Cryptography.SHA256]::Create()
  try { $hash = [System.BitConverter]::ToString($hashEngine.ComputeHash($archiveStream)).Replace('-', '').ToLowerInvariant() }
  finally { $archiveStream.Dispose(); $hashEngine.Dispose() }
  Set-Content -LiteralPath "$archive.sha256" -Value "$hash  $(Split-Path -Leaf $archive)" -Encoding utf8
  Write-Output "Portable package: $archive"
} finally { Pop-Location }
