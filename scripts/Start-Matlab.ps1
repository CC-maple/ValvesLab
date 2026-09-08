#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$valveRoot = Split-Path -Parent $PSScriptRoot
$matlabExe = 'C:\Program Files\MATLAB\R2025b\bin\matlab.exe'
if (-not (Test-Path -LiteralPath $matlabExe)) { throw "MATLAB R2025b not found: $matlabExe" }
if (Get-NetTCPConnection -LocalPort 8776 -State Listen,Established -ErrorAction SilentlyContinue) { throw 'Port 8776 is already occupied. Check the existing V3.1 MATLAB service.' }
$runtimeDir = Join-Path $valveRoot 'output\runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$matlabDir = (Join-Path $valveRoot 'matlab').Replace("'", "''")
$logPath = Join-Path $runtimeDir ('matlab-v31-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$startup = "addpath('$matlabDir'); start_valvelab;"
$matlabProcess = Start-Process -FilePath $matlabExe -WorkingDirectory $valveRoot -WindowStyle Hidden -PassThru -ArgumentList @('-nodesktop', '-nosplash', '-logfile', ('"' + $logPath + '"'), '-r', ('"' + $startup + '"'))
Write-Output "MATLAB launcher PID: $($matlabProcess.Id)"
Write-Output "Log: $logPath"
Write-Output 'ValveLab uses a desktopless MATLAB service to avoid session-recovery prompts. Scope, SDI, model, and analysis windows remain available from the webpage.'
Write-Output 'Wait for VALVELAB_READY in the log, then connect from the webpage.'
