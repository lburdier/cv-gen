@echo off
rem ==========================================================================
rem  CV GEN - lancement de l'application
rem    lancer.bat        compile puis lance l'app
rem    lancer.bat dev    mode developpement (rechargement a chaud)
rem ==========================================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title CV GEN

where node >nul 2>nul
if errorlevel 1 (
  echo [CV GEN] Node.js est introuvable. Installez-le depuis https://nodejs.org puis relancez.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [CV GEN] Installation des dependances, premiere fois uniquement...
  call npm install
  if errorlevel 1 goto :erreur
)

if /i "%~1"=="dev" (
  echo [CV GEN] Mode developpement...
  call npm run dev
  goto :fin
)

echo [CV GEN] Compilation...
call npm run build
if errorlevel 1 goto :erreur

echo [CV GEN] Lancement...
call npx electron .
if "%errorlevel%"=="3" (
  echo [CV GEN] L'application est deja ouverte : sa fenetre a ete mise au premier plan.
  timeout /t 4 >nul
)
goto :fin

:erreur
echo.
echo [CV GEN] Une erreur est survenue, voir les messages ci-dessus.
pause
exit /b 1

:fin
endlocal
