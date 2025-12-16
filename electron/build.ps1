# Change to script directory's parent (project root)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Host "Current directory: $(Get-Location)"
Write-Host "Project root: $projectRoot"

Write-Host "Building main.cjs..."
$env:BUILD_TARGET = 'main'
Write-Host "BUILD_TARGET = $env:BUILD_TARGET"
npx vite build --config electron/vite.config.ts
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ main.cjs build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE 
}
Start-Sleep -Milliseconds 500
if (Test-Path dist-electron\main.cjs) {
    Write-Host "✅ main.cjs verified: $(Get-Item dist-electron\main.cjs | Select-Object -ExpandProperty Length) bytes"
} else {
    Write-Host "❌ main.cjs NOT FOUND after build"
    Write-Host "Files in dist-electron:"
    Get-ChildItem dist-electron -File -ErrorAction SilentlyContinue | Select-Object Name
}

Write-Host "Building preload.cjs..."
$env:BUILD_TARGET = 'preload'
Write-Host "BUILD_TARGET = $env:BUILD_TARGET"
npx vite build --config electron/vite.config.ts
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ preload.cjs build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE 
}
Start-Sleep -Milliseconds 500
if (Test-Path dist-electron\preload.cjs) {
    Write-Host "✅ preload.cjs verified: $(Get-Item dist-electron\preload.cjs | Select-Object -ExpandProperty Length) bytes"
} else {
    Write-Host "❌ preload.cjs NOT FOUND after build"
}

Write-Host "✅ Build complete!"
Write-Host "Final files in dist-electron:"
Get-ChildItem dist-electron -File -Recurse | Select-Object FullName, @{Name="Size";Expression={$_.Length}}

