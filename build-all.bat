@echo off
title EsportsManager - Build completo
color 0A
echo.
echo  ================================================
echo   EsportsManager - Preparando demo de presentacion
echo  ================================================
echo.

:: Verificar que existe el .env del backend (necesario para Electron y Docker)
if not exist "backend\.env" (
    echo [ERROR] Falta el archivo backend\.env con las claves de Supabase.
    echo         Copia .env.example a backend\.env y rellena los valores.
    echo.
    pause
    exit /b 1
)

:: Crear carpeta de assets para el icono si no existe
if not exist "electron\assets" mkdir "electron\assets"

:: Usar el favicon de Angular como icono de la app si no hay icon.ico
if not exist "electron\assets\icon.ico" (
    copy "esports-admin\public\favicon.ico" "electron\assets\icon.ico" >nul 2>&1
    echo [OK] Icono creado desde favicon de la app.
)

:: 1. Compilar backend
echo.
echo [1/3] Compilando backend TypeScript...
cd backend
call npm ci --silent 2>nul || call npm install --silent
call npm run build
if errorlevel 1 (
    echo [ERROR] Fallo al compilar el backend.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Backend compilado.

:: 2. Compilar frontend Angular
echo.
echo [2/3] Compilando frontend Angular (puede tardar un par de minutos)...
cd esports-admin
call npm ci --silent 2>nul || call npm install --silent
call npm run build -- --configuration production
if errorlevel 1 (
    echo [ERROR] Fallo al compilar el frontend.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend compilado.

:: 3. Empaquetar aplicacion Electron
echo.
echo [3/3] Empaquetando aplicacion de escritorio (.exe)...
cd electron
call npm ci --silent 2>nul || call npm install --silent
call npm run build:win
if errorlevel 1 (
    echo [ERROR] Fallo al empaquetar Electron.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Instalador generado en dist-electron\

echo.
echo  ================================================
echo   Build completado con exito!
echo  ================================================
echo.
echo  PASO 1 - App de escritorio (icono en el escritorio):
echo    Ejecuta: dist-electron\EsportsManager Setup 1.0.0.exe
echo    Tras instalarlo, apareceera un icono en el escritorio.
echo.
echo  PASO 2 - App web (http://localhost en el navegador):
echo    Ejecuta: install-startup.bat  (solo una vez)
echo    Activa Docker Desktop > Settings > "Start Docker Desktop
echo    when you log in"
echo.
echo  Despues de reiniciar, todo arranca solo.
echo.
pause
