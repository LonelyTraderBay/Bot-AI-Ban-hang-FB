@echo off
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
call "C:\Program Files\nodejs\npm.cmd" --script-shell=cmd.exe run test:e2e -- tests/vertical-slices/fe022-flows.spec.ts --project=chromium > botsales-kit\execution\frontend-evidence\FE022\S04-focused-vertical-slices-current-20261004.log 2>&1
set "RESULT=%ERRORLEVEL%"
>> botsales-kit\execution\frontend-evidence\FE022\S04-focused-vertical-slices-current-20261004.log echo EXIT_CODE=%RESULT%
type botsales-kit\execution\frontend-evidence\FE022\S04-focused-vertical-slices-current-20261004.log
exit /b %RESULT%
