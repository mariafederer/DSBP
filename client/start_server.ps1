# DSBP Frontend Server Startup Script
# This script ensures the server starts in the correct directory

# Get the script's directory (where this file is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Change to the script directory
Set-Location $ScriptDir

# Verify register.html exists
if (-not (Test-Path "register.html")) {
    Write-Host "[ERROR] register.html not found in current directory!" -ForegroundColor Red
    Write-Host "Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "Please ensure you're running this script from the client directory." -ForegroundColor Yellow
    pause
    exit 1
}

# Check if port 3000 is already in use
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[WARNING] Port 3000 is already in use!" -ForegroundColor Yellow
    Write-Host "Stopping existing process..." -ForegroundColor Yellow
    $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DSBP Frontend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server in: $PWD" -ForegroundColor Gray
Write-Host ""
Write-Host "Frontend URL: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Register page: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000/register.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "Login page: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000/login.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Python HTTP server
python -m http.server 3000

