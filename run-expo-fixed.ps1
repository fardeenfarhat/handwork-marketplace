# Script to run Expo with correct IP configuration
Write-Host "Starting Expo Mobile App (Fixed IP)..." -ForegroundColor Green
Write-Host "Computer IP: 192.168.18.19" -ForegroundColor Cyan
Write-Host "Backend API: http://192.168.18.19:8000" -ForegroundColor Cyan
Write-Host ""

Set-Location mobile

# Copy the updated environment file
if (Test-Path ".env.development") {
    Copy-Item ".env.development" ".env" -Force
    Write-Host "✅ Updated environment loaded" -ForegroundColor Green
}

# Start Expo with LAN
Write-Host "Starting Expo with LAN access..." -ForegroundColor Green
npx expo start --lan --clear