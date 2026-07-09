@echo off
title Deepa BMS - Windows Deployment Assistant
setlocal enabledelayedexpansion

echo =======================================================================
echo          DEEPA BMS -- AUTOMATED WINDOWS DEPLOYMENT ASSISTANT
echo =======================================================================
echo.
echo This script will set up and launch the Deepa BMS server on this Windows 
echo machine, exposing it for other Android devices and Windows apps.
echo.
echo =======================================================================
echo.

:: 1. Check for Docker
echo [1/3] Checking system prerequisites...
where docker >nul 2>nul
if %errorlevel% equ 0 (
    set DOCKER_AVAILABLE=1
    echo   [x] Docker Desktop is installed.
) else (
    set DOCKER_AVAILABLE=0
    echo   [ ] Docker Desktop is not found.
)

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    set NODE_AVAILABLE=1
    echo   [x] Node.js is installed.
) else (
    set NODE_AVAILABLE=0
    echo   [ ] Node.js is not found.
)
echo.

:: 2. Choose deployment path
if %DOCKER_AVAILABLE% equ 1 (
    echo =======================================================================
    echo   RECOMMENDED: Deploy via Docker (Includes Postgres, Nginx, and Tunnel)
    echo =======================================================================
    echo Press [D] to deploy using Docker Compose (Recommended)
    if %NODE_AVAILABLE% equ 1 (
        echo Press [L] to deploy using local Node.js directly
    )
    echo Press [Q] to Quit
    echo.
    set /p CHOICE="Enter your choice: "
) else (
    if %NODE_AVAILABLE% equ 1 (
        echo Docker is not installed. Falling back to local Node.js deployment...
        set CHOICE=L
        pause
    ) else (
        echo.
        echo [ERROR] Neither Docker nor Node.js were found on this system.
        echo Please install at least one of the following to deploy the server:
        echo   1. Docker Desktop: https://www.docker.com/products/docker-desktop/
        echo   2. Node.js (v18 or v20): https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
)

if /i "%CHOICE%"=="Q" exit /b 0

if /i "%CHOICE%"=="D" (
    echo.
    echo =======================================================================
    echo Deploying via Docker Compose...
    echo =======================================================================
    
    :: Start Docker services with the demo quick tunnel profile
    docker compose --profile demo up -d
    
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] Deepa BMS services started in the background!
        echo.
        echo -------------------------------------------------------------------
        echo   FETCHING YOUR PUBLIC REMOTE SYNC ENDPOINT...
        echo   (Waiting 5 seconds for Cloudflare connection to establish)
        echo -------------------------------------------------------------------
        timeout /t 5 >nul
        
        echo.
        echo Cloudflare Quick Tunnel Logs:
        docker logs deepa-bms-tunnel-demo 2>&1 | findstr /i "trycloudflare.com"
        echo.
        echo If the URL is not shown above, run this command to inspect logs:
        echo   docker logs deepa-bms-tunnel-demo
        echo.
    ) else (
        echo [ERROR] Docker Compose failed to start. Make sure Docker Desktop is running.
    )
    goto end
)

if /i "%CHOICE%"=="L" (
    echo.
    echo =======================================================================
    echo Deploying via local Node.js (SQLite + Quick Tunnel)...
    echo =======================================================================
    
    echo Installing backend dependencies...
    cd apps\backend
    call npm install
    
    echo Building Express API server...
    call npm run build
    
    echo.
    echo Starting server with automated Quick Tunnel...
    echo (Leave this console window open to keep the server running)
    echo.
    
    :: Run start script with tunnel flag
    call npm start -- --tunnel
    goto end
)

:end
echo.
echo =======================================================================
echo          CONNECTION ENDPOINTS FOR CLIENT DEVICES
echo =======================================================================
echo.
echo 1. LOCAL SYNC (Same Wi-Fi network):
echo    Look up your local IP address below:
ipconfig | findstr /i "ipv4"
echo.
echo    Example Server URL: http://[your-ip-address]:3000
echo.
echo 2. REMOTE SYNC (Any network / 4G / 5G / Internet):
echo    Use the secure trycloudflare.com HTTPS URL printed in the logs above.
echo.
echo Enter the corresponding URL in Settings -> serverUrl on your apps.
echo =======================================================================
echo.
pause
