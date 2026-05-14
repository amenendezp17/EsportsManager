@echo off
title EsportsManager - Instalar inicio automatico
echo.
echo  Instalando inicio automatico de la web en Docker...
echo.

set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SCRIPT=%~dp0start-web-demo.vbs

copy "%SCRIPT%" "%STARTUP%\EsportsManager-web.vbs" >nul

if errorlevel 1 (
    echo [ERROR] No se pudo copiar el script de inicio.
    pause
    exit /b 1
)

echo [OK] Inicio automatico instalado correctamente.
echo.
echo  IMPORTANTE: Para que funcione al arrancar Windows debes:
echo  1. Abrir Docker Desktop
echo  2. Ir a Settings ^> General
echo  3. Activar "Start Docker Desktop when you log in"
echo  4. Reiniciar el PC
echo.
echo  Tras el reinicio, la web estara disponible en:
echo  http://localhost
echo.
pause
