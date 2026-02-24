# Grapplay Backup Script
$OutputEncoding = [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Auto-add Git path
$gitPaths = @(
    "C:\Program Files\Git\cmd",
    "C:\Program Files\Git\bin",
    "$env:LOCALAPPDATA\Programs\Git\cmd"
)

foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $env:Path += ";$path"
        break
    }
}

# Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git not found. Please install Git." -ForegroundColor Red
    exit
}

Write-Host "=== Grapplay Backup Start ===" -ForegroundColor Green

# Check status
Write-Host "`nModified files:" -ForegroundColor Yellow
git status --short

# Get commit message
$commitMessage = Read-Host "`nEnter commit message (default: Auto Backup)"

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Auto Backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# Execute Git commands
Write-Host "`nAdding files..." -ForegroundColor Cyan
git add .

Write-Host "Committing..." -ForegroundColor Cyan
git commit -m "$commitMessage"

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Backup Complete! ===" -ForegroundColor Green
Write-Host "Check at: https://github.com/armbareum-beep/grappl" -ForegroundColor Blue

# Auto close after 5 seconds
Start-Sleep -Seconds 5
