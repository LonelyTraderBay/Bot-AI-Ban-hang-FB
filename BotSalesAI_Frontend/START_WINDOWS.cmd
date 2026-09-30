@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Chua co Node.js 24. Hay cai Node.js roi mo lai. & pause & exit /b 1)
where npm >nul 2>nul || (echo Khong tim thay npm. & pause & exit /b 1)
if not exist node_modules\typescript (
  call npm install
  if errorlevel 1 (echo Cai dependencies chua thanh cong. Xem loi ben tren. & pause & exit /b 1)
)
call npm run setup
if errorlevel 1 (pause & exit /b 1)
call npm run dev
if errorlevel 1 pause
