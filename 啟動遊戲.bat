@echo off
chcp 65001 >nul
title 駭客入侵 - 資安卡牌遊戲
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 找不到 Node.js，請先安裝 Node.js（https://nodejs.org）後再執行。
  pause
  exit /b 1
)

if not exist node_modules (
  echo 第一次執行，正在準備遊戲所需的元件，請稍候...
  call npm install
  if errorlevel 1 (
    echo 準備失敗，請確認網路連線後再試一次。
    pause
    exit /b 1
  )
)

if not exist dist\index.html (
  echo 正在整理遊戲，請稍候...
  call npm run build
  if errorlevel 1 (
    echo 整理失敗。
    pause
    exit /b 1
  )
)

echo.
echo 遊戲已啟動，瀏覽器會自動開啟。
echo 要結束遊戲時，關閉這個視窗即可。
echo.
start "" http://127.0.0.1:4173/
call npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
pause
