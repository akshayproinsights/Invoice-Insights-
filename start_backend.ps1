# Start Backend with Logs
# Run this in PowerShell

Write-Host "Starting Backend with logging enabled..." -ForegroundColor Green

# Navigate to backend directory
Set-Location "c:\Users\MSi\Documents\Superbase\backend"

# Enable unbuffered output
$env:PYTHONUNBUFFERED = "1"

# Start uvicorn
Write-Host "`nBackend will start on http://localhost:8000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

python -m uvicorn main:app --reload --port 8000
