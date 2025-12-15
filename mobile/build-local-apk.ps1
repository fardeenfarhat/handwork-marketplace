# Build APK Locally for Client Testing
Write-Host "🚀 Building APK for Client..." -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Navigate to mobile directory
$mobileDir = "D:\HandworkMarketplace\mobile"
Set-Location $mobileDir

Write-Host "📂 Current directory: $mobileDir`n" -ForegroundColor Yellow

# Check if Android folder exists
if (-not (Test-Path ".\android")) {
    Write-Host "❌ Android folder not found. Running expo prebuild..." -ForegroundColor Red
    npx expo prebuild --platform android
}

# Navigate to android folder
Set-Location ".\android"

Write-Host "🔨 Building Release APK..." -ForegroundColor Green
Write-Host "This will take 5-10 minutes...`n" -ForegroundColor Yellow

# Build the release APK
.\gradlew assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "================================`n" -ForegroundColor Green
    
    $apkPath = ".\app\build\outputs\apk\release\app-release.apk"
    $fullPath = Resolve-Path $apkPath
    
    Write-Host "📱 APK Location:" -ForegroundColor Cyan
    Write-Host "$fullPath`n" -ForegroundColor White
    
    # Get file size
    $size = (Get-Item $apkPath).Length / 1MB
    Write-Host "📊 File Size: $([math]::Round($size, 2)) MB`n" -ForegroundColor Yellow
    
    Write-Host "📤 HOW TO SHARE WITH CLIENT:" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "1. Upload APK to Google Drive / Dropbox / WeTransfer" -ForegroundColor White
    Write-Host "2. Get a shareable link" -ForegroundColor White
    Write-Host "3. Send link to your client" -ForegroundColor White
    Write-Host "4. Client downloads and installs on Android device`n" -ForegroundColor White
    
    Write-Host "💡 Quick Upload Options:" -ForegroundColor Yellow
    Write-Host "   • Google Drive: drive.google.com" -ForegroundColor White
    Write-Host "   • Dropbox: dropbox.com" -ForegroundColor White
    Write-Host "   • WeTransfer: wetransfer.com (no account needed)" -ForegroundColor White
    Write-Host "   • OneDrive: onedrive.com`n" -ForegroundColor White
    
    # Ask if user wants to open the folder
    Write-Host "Would you like to open the APK folder? (Y/N): " -ForegroundColor Cyan -NoNewline
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        explorer.exe (Split-Path $fullPath -Parent)
    }
    
} else {
    Write-Host "`n❌ BUILD FAILED" -ForegroundColor Red
    Write-Host "================================`n" -ForegroundColor Red
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Make sure Android SDK is installed" -ForegroundColor White
    Write-Host "2. Set ANDROID_HOME environment variable" -ForegroundColor White
    Write-Host "3. Run: npm install in mobile directory`n" -ForegroundColor White
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
