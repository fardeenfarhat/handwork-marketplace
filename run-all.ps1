# Master script to start all three services
Write-Host "🚀 Starting All Services - Handwork Marketplace" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

$currentDir = Get-Location

# Start Backend
Write-Host "1. Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$currentDir\run-backend.ps1'"
Start-Sleep -Seconds 2

# Start Frontend  
Write-Host "2. Starting Frontend (Admin Web)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$currentDir\run-frontend.ps1'"
Start-Sleep -Seconds 2

# Start Expo
Write-Host "3. Starting Expo Mobile App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$currentDir\run-expo.ps1'"

Write-Host ""
Write-Host "✅ All services are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Admin Web: http://localhost:3000" -ForegroundColor White
Write-Host "   Expo DevTools: http://localhost:19002" -ForegroundColor White
Write-Host ""
Write-Host "📱 For mobile testing:" -ForegroundColor Yellow
Write-Host "   - Use Expo Go app on your phone" -ForegroundColor White
Write-Host "   - Scan the QR code from Expo DevTools" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")