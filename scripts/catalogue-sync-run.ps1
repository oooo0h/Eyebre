$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$env:PYTHONIOENCODING = 'utf-8'
$repoPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoPath
$configPath = Join-Path $repoPath '.catalogue-sync\config.json'
$syncConfig = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$env:PATH = "$($syncConfig.nodeDirectory);$($syncConfig.gitDirectory);$($syncConfig.ghDirectory);$env:PATH"
$logDirectory = Join-Path $repoPath '.catalogue-sync\logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$logPath = Join-Path $logDirectory ('sync-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
Write-Host "Eyebre catalogue sync - log: $logPath"
try {
    # Windows PowerShell 5 treats even successful native stderr (git progress)
    # as ErrorRecord objects. Use the process exit status to decide success.
    $ErrorActionPreference = 'Continue'
    & $syncConfig.python -u (Join-Path $PSScriptRoot 'sync-catalogues.py') @args 2>&1 | Tee-Object -FilePath $logPath
    $taskExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
} catch {
    $_ | Out-String | Tee-Object -FilePath $logPath -Append | Write-Host
    $taskExitCode = 1
}
exit $taskExitCode
