# Start Frontend
# Run this in PowerShell

Write-Host "Starting Frontend..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location "c:\Users\MSi\Documents\Superbase\frontend"

# Start dev server
Write-Host "`nFrontend will start on http://localhost:5173" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

npm run dev
