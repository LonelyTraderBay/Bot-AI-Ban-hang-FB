@echo off
setlocal
cd /d "C:\Users\Joker-PC\Documents\Projects\Bot-AI-Ban-hang-FB\BotSalesAI_Frontend"
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
call npm.cmd run test:e2e > "botsales-kit\execution\frontend-evidence\FE008\S05-e2e-final-current-20261004.log" 2>&1
set "RESULT=%ERRORLEVEL%"
echo EXIT_CODE=%RESULT%>>"botsales-kit\execution\frontend-evidence\FE008\S05-e2e-final-current-20261004.log"
exit /b %RESULT%
