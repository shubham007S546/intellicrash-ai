# IntelliCrash Production Sync Script
# Run this to push all recent fixes and BI enhancements to GitHub

Write-Host "--- Starting IntelliCrash Production Sync ---" -ForegroundColor Cyan

# 1. Add all changes
Write-Host "[1/3] Staging changes..." -ForegroundColor Yellow
git add .

# 2. Commit with professional message
$commitMsg = "Production Hardening: BI Analytics, Bulletin Overhaul, and API Stability [v18.1]"
Write-Host "[2/3] Committing: $commitMsg" -ForegroundColor Yellow
git commit -m $commitMsg

# 3. Push to main
Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Sync Complete! Your production environment is now up to date." -ForegroundColor Green
} else {
    Write-Host "ERROR: Sync Failed. Please check your internet connection or git permissions." -ForegroundColor Red
}
