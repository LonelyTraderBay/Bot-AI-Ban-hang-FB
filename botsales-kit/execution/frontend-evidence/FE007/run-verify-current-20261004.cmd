@echo off
setlocal
cd /d "C:\Users\Joker-PC\Documents\Projects\Bot-AI-Ban-hang-FB\BotSalesAI_Frontend"
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
call npm.cmd --script-shell=cmd.exe run verify > "botsales-kit\execution\frontend-evidence\FE007\S05-verify-current-20261004.log" 2>&1
exit /b %ERRORLEVEL%
