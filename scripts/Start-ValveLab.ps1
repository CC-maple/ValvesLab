#requires -Version 7.0
param([ValidateRange(10, 300)][int]$WaitSeconds = 150)
$ErrorActionPreference = 'Stop'
$valveRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$nodeVersion = [version]((& $nodeExe -p 'process.versions.node').Trim())
if ($nodeVersion -lt [version]'22.12.0') { throw 'Node.js 22.12+ is required.' }
$runtimeDir = Join-Path $valveRoot 'output\runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'

function Start-ValveNode {
    param([string]$Name, [int]$Port, [string[]]$NodeArguments)
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Output "$Name port $Port occupied by PID $($listener[0].OwningProcess); checking the service protocol."
        return
    }
    $outLog = Join-Path $runtimeDir "$Name-$stamp.log"
    $errLog = Join-Path $runtimeDir "$Name-$stamp.error.log"
    $serviceProcess = Start-Process -FilePath $nodeExe -WorkingDirectory $valveRoot -ArgumentList $NodeArguments -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
    Write-Output "$Name PID $($serviceProcess.Id), log: $outLog"
}

$bridgeFile = Join-Path $valveRoot 'bridge\server.mjs'
$viteFile = Join-Path $valveRoot 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $viteFile)) { throw 'Run npm install before starting ValveLab.' }
Start-ValveNode -Name 'bridge-v31' -Port 8765 -NodeArguments @(('"' + $bridgeFile + '"'))
Start-ValveNode -Name 'web-v31' -Port 5173 -NodeArguments @(('"' + $viteFile + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort')
$deadline = (Get-Date).AddSeconds(12)
$bridgeReady = $false
do {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/api/health' -TimeoutSec 2
        $bridgeReady = $health.ok -and $health.service -eq 'valvelab-bridge' -and $health.version -eq '3.1' -and $health.protocol -eq 31
    } catch { $bridgeReady = $false }
    if (-not $bridgeReady) { Start-Sleep -Milliseconds 700 }
} until ($bridgeReady -or (Get-Date) -ge $deadline)
if (-not $bridgeReady) { throw 'Port 8765 is not a healthy ValveLab V3.1 bridge. Check the PID and log above; stop the old project bridge before rerunning this script.' }
$deadline = (Get-Date).AddSeconds(12)
$webReady = $false
$lastWebIssue = 'The V3.1 webpage is starting.'
do {
    try {
        $web = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 3
        $webReady = $web.Content -match 'name="valvelab-version" content="3.1"'
        if (-not $webReady) { $lastWebIssue = 'Port 5173 is serving a different webpage.' }
    } catch { $lastWebIssue = $_.Exception.Message }
    if (-not $webReady) { Start-Sleep -Milliseconds 700 }
} until ($webReady -or (Get-Date) -ge $deadline)
if (-not $webReady) {
    $webErrorLog = Join-Path $runtimeDir "web-v31-$stamp.error.log"
    throw "The V3.1 webpage did not become ready. Web error log: $webErrorLog. Last issue: $lastWebIssue"
}
Write-Output 'Web V3.1 and bridge V3.1 are ready.'
if (-not (Get-NetTCPConnection -LocalPort 8776 -State Listen,Established -ErrorAction SilentlyContinue)) {
    & (Join-Path $PSScriptRoot 'Start-Matlab.ps1')
} else { Write-Output 'MATLAB TCP 8776 is active; checking release, protocol, and model readiness.' }
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$matlabReady = $false
$lastIssue = 'MATLAB is starting.'
do {
    try {
        $status = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/api/status' -TimeoutSec 8
        if ($status.ok -and $status.snapshot) {
            if ($status.snapshot.protocol -ne 31 -or $status.snapshot.release -ne '2025b' -or $status.snapshot.model -ne 'valvelab_v31') {
                throw 'The existing MATLAB service has an incompatible model or protocol. Restart the project MATLAB service using V3.1.'
            }
            if ($status.snapshot.error) { throw "MATLAB model error: $($status.snapshot.error)" }
            $matlabReady = $true
        }
    } catch {
        $lastIssue = $_.Exception.Message
        if ($lastIssue -like '*incompatible*' -or $lastIssue -like 'MATLAB model error:*') { throw }
    }
    if (-not $matlabReady) {
        Write-Output 'Waiting for MATLAB R2025b and valvelab_v31...'
        Start-Sleep -Seconds 2
    }
} until ($matlabReady -or (Get-Date) -ge $deadline)
if (-not $matlabReady) { throw "MATLAB did not become ready within $WaitSeconds seconds. Logs: $runtimeDir. Last issue: $lastIssue" }
Write-Output 'VALVELAB_V31_READY: web + bridge + MATLAB model verified.'
Write-Output 'Open http://127.0.0.1:5173/ and click Connect control. Existing runs are not reset by this script.'
