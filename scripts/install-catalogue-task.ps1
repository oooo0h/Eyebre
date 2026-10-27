$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
Start-Transcript -Path (Join-Path $repoPath '.catalogue-sync\task-install.log') -Append | Out-Null
$syncConfig = Get-Content -LiteralPath (Join-Path $repoPath '.catalogue-sync\config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskName = 'Eyebre-Catalogue-Daily-Sync'
$account = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($account -match 'codexsandbox') { throw 'Register this task under the signed-in Windows account, not the sandbox account.' }
$commandFile = Join-Path $PSScriptRoot 'catalogue-sync.cmd'
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\cmd.exe" -Argument ('/d /c ""' + $commandFile + '""') -WorkingDirectory $repoPath
$firstRun = (Get-Date).Date.AddHours(10)
if ($firstRun -le (Get-Date)) { $firstRun = $firstRun.AddDays(1) }
$trigger = New-ScheduledTaskTrigger -Daily -At $firstRun
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$definition = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Check the ten configured source PDFs at 10:00 daily. Show CMD logs, update GitHub Pages on content changes, close on success; keep errors visible.'

# Ordinary Windows shortcuts, never copies of the WeDrive originals.
$shortcutDirectory = $syncConfig.shortcutDirectory
New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
foreach ($entry in $syncConfig.sources.PSObject.Properties) {
    $sourcePath = [string]$entry.Value
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Source missing: $sourcePath" }
    $name = [System.IO.Path]::GetFileNameWithoutExtension($sourcePath) + '.lnk'
    $shortcut = $shell.CreateShortcut((Join-Path $shortcutDirectory $name))
    $shortcut.TargetPath = $sourcePath
    $shortcut.WorkingDirectory = Split-Path -Parent $sourcePath
    $shortcut.Description = 'Eyebre source PDF - opens the original WeDrive file'
    $shortcut.Save()
}
Register-ScheduledTask -TaskName $taskName -InputObject $definition -Force | Out-Null
$task = Get-ScheduledTask -TaskName $taskName
$info = $task | Get-ScheduledTaskInfo
[pscustomobject]@{ TaskName=$task.TaskName; User=$task.Principal.UserId; LogonType=$task.Principal.LogonType; NextRunTime=$info.NextRunTime; Command=$task.Actions.Execute; Arguments=$task.Actions.Arguments; ShortcutCount=(Get-ChildItem -LiteralPath $shortcutDirectory -Filter '*.lnk').Count } | Format-List
Export-ScheduledTask -TaskName $taskName | Set-Content -LiteralPath (Join-Path $repoPath '.catalogue-sync\task-definition.xml') -Encoding Unicode
Stop-Transcript | Out-Null
