# DSBP Frontend Startup Script (PowerShell)
Write-Host "Starting frontend server..." -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Register page: http://localhost:3000/register.html" -ForegroundColor Yellow
Write-Host "Login page: http://localhost:3000/login.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Change to client directory
Set-Location $PSScriptRoot

# Start Python HTTP server
python -m http.server 3000

