# Simple PowerShell script to start the frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Green
Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""

Set-Location admin-web

# Copy environment file if it exists
if (Test-Path ".env.development") {
    Copy-Item ".env.development" ".env.local" -Force
    Write-Host "Environment loaded" -ForegroundColor Yellow
}

npm start