@echo off
chcp 65001 >nul
title Eyebre Catalogue Sync
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0catalogue-sync-run.ps1" %*
if errorlevel 1 (
    echo.
    echo Eyebre sync failed. See the log above. Press any key to close.
    pause >nul
    exit /b 1
)
exit /b 0
