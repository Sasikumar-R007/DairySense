# Script to update DATABASE_URL in .env file
# Usage: .\update-env.ps1 "your-connection-string-here"

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl
)

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

# Read the current .env file
$content = Get-Content $envFile

# Replace the DATABASE_URL line
$updatedContent = $content | ForEach-Object {
    if ($_ -match "^DATABASE_URL=") {
        "DATABASE_URL=$DatabaseUrl"
    } else {
        $_
    }
}

# Write back to file
$updatedContent | Set-Content $envFile

Write-Host "✅ Updated DATABASE_URL in .env file" -ForegroundColor Green
Write-Host "📝 You can now start the backend with: npm run dev" -ForegroundColor Cyan

