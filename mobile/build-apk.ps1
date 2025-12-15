# Quick Build Script for APK
# Run this script to build a testing APK

Write-Host "🚀 Handwork Marketplace - APK Builder" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Check if we're in the mobile directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the mobile directory" -ForegroundColor Red
    exit 1
}

# Check if EAS CLI is installed
Write-Host "Checking EAS CLI installation..." -ForegroundColor Yellow
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easInstalled) {
    Write-Host "📦 Installing EAS CLI..." -ForegroundColor Yellow
    npm install -g eas-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install EAS CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ EAS CLI installed successfully`n" -ForegroundColor Green
} else {
    Write-Host "✅ EAS CLI already installed`n" -ForegroundColor Green
}

# Show build options
Write-Host "Select build profile:" -ForegroundColor Cyan
Write-Host "1. Preview (Quick testing APK - Recommended)" -ForegroundColor White
Write-Host "2. Staging (Staging environment APK)" -ForegroundColor White
Write-Host "3. Production (Production AAB for Play Store)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

$profile = switch ($choice) {
    "1" { "preview" }
    "2" { "staging" }
    "3" { "production" }
    default { 
        Write-Host "❌ Invalid choice. Defaulting to preview." -ForegroundColor Yellow
        "preview"
    }
}

Write-Host "`n🏗️  Building APK with profile: $profile" -ForegroundColor Cyan
Write-Host "This will take approximately 10-15 minutes...`n" -ForegroundColor Yellow

# Run the build
Write-Host "Starting build process..." -ForegroundColor Green
eas build --platform android --profile $profile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "`n📱 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Download the APK from the link provided above" -ForegroundColor White
    Write-Host "2. Share the download link with your client" -ForegroundColor White
    Write-Host "3. Client can install directly on Android device" -ForegroundColor White
    Write-Host "`n💡 Tip: You can view all builds at https://expo.dev" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Build failed. Please check the errors above." -ForegroundColor Red
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "- Run: eas login" -ForegroundColor White
    Write-Host "- Check your Expo account has build credits" -ForegroundColor White
    Write-Host "- Ensure all dependencies are installed: npm install" -ForegroundColor White
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
