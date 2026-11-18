@echo off
chcp 65001 >nul
title Eyebre 画册同步
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0catalogue-sync-run.ps1" %*
if errorlevel 1 (
    echo.
    echo Eyebre 画册同步未完成，请查看上方中文说明和日志。按任意键关闭窗口。
    pause >nul
    exit /b 1
)
exit /b 0
