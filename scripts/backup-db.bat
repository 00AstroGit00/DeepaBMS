@echo off
:: Deepa BMS - Windows Database Backup Script
:: This script copies the SQLite database file to a backup folder with a timestamp
:: and removes files older than 30 days to save disk space.

setlocal enabledelayedexpansion

:: Configure paths
set DB_FILE=..\apps\backend\deepa-bms.db
set BACKUP_DIR=..\backups

:: Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

:: Get current timestamp (YYYY-MM-DD-HHMM)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%-%datetime:~8,4%

set BACKUP_FILE=%BACKUP_DIR%\deepa-bms-backup-%TIMESTAMP%.db

:: Copy database file
if exist "%DB_FILE%" (
    copy "%DB_FILE%" "%BACKUP_FILE%" >nul
    if %errorlevel% equ 0 (
        echo [%date% %time%] Database backup created successfully: %BACKUP_FILE%
        
        :: Delete backups older than 30 days
        forfiles /p "%BACKUP_DIR%" /m deepa-bms-backup-*.db /d -30 /c "cmd /c del @path" 2>nul
    ) else (
        echo [ERROR] Failed to copy database file.
    )
) else (
    echo [ERROR] Database file not found at %DB_FILE%. Make sure the server has run at least once.
)
