$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
npm ci
if ($LASTEXITCODE -ne 0) { throw '依赖安装失败' }
npm test
if ($LASTEXITCODE -ne 0) { throw '测试失败' }
npm run dist:win
if ($LASTEXITCODE -ne 0) { throw '构建失败' }
Write-Host '安装包位于 desktop/release'
