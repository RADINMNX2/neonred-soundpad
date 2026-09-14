# Test-sign the built NeonRed Cable driver and export its certificate.
# Run AFTER msbuild; produces: build\test-sign\{neoredcable.sys, neoredcable.inf,
# neoredcable.cer}. The .cer must be installed in the Test Mode VM's Trusted
# Root before `devcon install`.

param(
    [string]$WinKits = "$env:ProgramFiles(x86)\Windows Kits\10",
    [string]$BuildDir = "$PSScriptRoot\..\build\Release\x64"
)

$ErrorActionPreference = "Stop"

$signtool = Get-ChildItem -Path (Join-Path $WinKits "bin") -Filter signtool.exe -Recurse |
    Sort-Object FullName -Descending | Select-Object -First 1
if (-not $signtool) { throw "signtool.exe not found under $WinKits (WDK required)" }

$inf2cat = Get-ChildItem -Path (Join-Path $WinKits "bin") -Filter inf2cat.exe -Recurse |
    Sort-Object FullName -Descending | Select-Object -First 1
if (-not $inf2cat) { throw "inf2cat.exe not found under $WinKits (WDK required)" }

$out = Join-Path $PSScriptRoot "..\build\test-sign"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$subject = "CN=NeonRed Cable Test (2026-09)"
$cert = Get-ChildItem -Path Cert:\CurrentUser\My\* | Where-Object { $_.Subject -eq $subject } | Select-Object -First 1
if (-not $cert) {
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $subject `
        -CertStoreLocation Cert:\CurrentUser\My `
        -NotAfter (Get-Date).AddYears(3) `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")
}

Export-Certificate -Cert $cert -FilePath (Join-Path $out "neoredcable.cer") | Out-Null

$inf = Join-Path $BuildDir "neoredcable.inf"
if (-not (Test-Path $inf)) { $inf = (Get-ChildItem -Path $BuildDir -Filter *.inf -Recurse | Select-Object -First 1).FullName }
$pkg = (Split-Path $inf -Parent)

& $inf2cat.FullName /driver:$pkg /os:10_X64 | Out-Host
$cat = Get-ChildItem -Path $pkg -Filter *.cat | Select-Object -First 1

& $signtool.FullName sign /v /fd SHA256 /a /s My /n $subject /t http://timestamp.digicert.com (Join-Path $pkg "neoredcable.sys") | Out-Host
if ($LASTEXITCODE -ne 0) { throw "signtool failed on .sys" }

if ($cat) {
    & $signtool.FullName sign /v /fd SHA256 /a /s My /n $subject /t http://timestamp.digicert.com $cat.FullName | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "signtool failed on .cat" }
}

Copy-Item (Join-Path $pkg "neoredcable.sys") $out -Force
Copy-Item $inf $out -Force
if ($cat) { Copy-Item $cat.FullName $out -Force }

Write-Host ""
Write-Host "Test-sign complete. Artifacts in: $out"
Write-Host "In the Test Mode VM: import neoredcable.cer as trusted root, then run:"
Write-Host "  devcon install $inf Root\NRC0000"