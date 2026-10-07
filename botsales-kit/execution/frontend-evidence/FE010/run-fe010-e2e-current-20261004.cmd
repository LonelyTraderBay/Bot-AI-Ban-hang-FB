@echo off
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
call "C:\Program Files\nodejs\npm.cmd" --script-shell=cmd.exe run test:e2e -- tests/fe010.spec.ts > botsales-kit\execution\frontend-evidence\FE010\S05-fe010-e2e-current-20261004.log 2>&1
set "RESULT=%ERRORLEVEL%"
>> botsales-kit\execution\frontend-evidence\FE010\S05-fe010-e2e-current-20261004.log echo EXIT_CODE=%RESULT%
type botsales-kit\execution\frontend-evidence\FE010\S05-fe010-e2e-current-20261004.log
exit /b %RESULT%
