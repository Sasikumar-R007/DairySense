# Script to switch from connection pooling to direct connection
# This can help if connection pooling times out

Write-Host "`n🔄 Switching to direct connection (port 5432)..." -ForegroundColor Yellow

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

# Read current connection string
$content = Get-Content $envFile
$currentUrl = ($content | Select-String "DATABASE_URL=(.+)").Matches.Groups[1].Value

if ($currentUrl -match "pooler\.supabase\.com:6543") {
    # Replace pooler with direct connection
    $newUrl = $currentUrl -replace "pooler\.supabase\.com:6543", "db.$(($currentUrl -split '@')[1] -split '\.')[0].supabase.co:5432"
    $newUrl = $newUrl -replace "postgres\.", "postgres:"
    
    # Update the file
    $updatedContent = $content | ForEach-Object {
        if ($_ -match "^DATABASE_URL=") {
            "DATABASE_URL=$newUrl"
        } else {
            $_
        }
    }
    
    $updatedContent | Set-Content $envFile
    
    Write-Host "✅ Switched to direct connection" -ForegroundColor Green
    Write-Host "📝 Updated DATABASE_URL to use port 5432 (direct connection)" -ForegroundColor Cyan
    Write-Host "`n⚠️  Note: You may need to get the direct connection string from Supabase:" -ForegroundColor Yellow
    Write-Host "   Dashboard → Settings → Database → Connection string → Direct connection" -ForegroundColor Yellow
    Write-Host "`n🔄 Restart your server: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "ℹ️  Connection string doesn't appear to use pooling" -ForegroundColor Yellow
    Write-Host "   Current: $currentUrl" -ForegroundColor Gray
}

