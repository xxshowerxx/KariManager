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
  $publicDocs = @('output-template-language.md')
  $portableDocs = Join-Path $portableFolder 'docs'
  New-Item -ItemType Directory -Force -Path $portableDocs | Out-Null
  foreach ($document in $publicDocs) {
    Copy-Item -LiteralPath (Join-Path $workspace "docs/$document") -Destination $portableDocs -Force
  }
  # 单独准备归档文档，避免旧便携目录里的调研或个人文件进入压缩包。
  $stagingRoot = Join-Path $workspace ".tooling/portable/$([guid]::NewGuid().ToString('N'))"
  $archiveDocs = Join-Path $stagingRoot 'docs'
  New-Item -ItemType Directory -Force -Path $archiveDocs | Out-Null
  $archive = "$portableFolder.zip"
  try {
    foreach ($document in $publicDocs) {
      Copy-Item -LiteralPath (Join-Path $workspace "docs/$document") -Destination $archiveDocs
    }
    Compress-Archive -LiteralPath (Join-Path $portableFolder 'KariManager.exe'), (Join-Path $portableFolder 'README.md'), (Join-Path $portableFolder 'LICENSE'), $archiveDocs -DestinationPath $archive -Force
  } finally {
    $resolvedStaging = [System.IO.Path]::GetFullPath($stagingRoot)
    $stagingParent = [System.IO.Path]::GetFullPath((Join-Path $workspace '.tooling/portable')) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolvedStaging.StartsWith($stagingParent, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw 'Package staging directory is outside the workspace'
    }
    Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
  }
  $archiveStream = [System.IO.File]::OpenRead($archive)
  $hashEngine = [System.Security.Cryptography.SHA256]::Create()
  try { $hash = [System.BitConverter]::ToString($hashEngine.ComputeHash($archiveStream)).Replace('-', '').ToLowerInvariant() }
  finally { $archiveStream.Dispose(); $hashEngine.Dispose() }
  Set-Content -LiteralPath "$archive.sha256" -Value "$hash  $(Split-Path -Leaf $archive)" -Encoding utf8
  Write-Output "Portable package: $archive"
} finally { Pop-Location }
