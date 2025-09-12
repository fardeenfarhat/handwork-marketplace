# Simple PowerShell script to start the backend
Write-Host "Starting Backend Server..." -ForegroundColor Green
Write-Host "URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

Set-Location backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload