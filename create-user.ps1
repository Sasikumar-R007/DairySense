# DairySense - User Creation Script

Write-Host "`n=== DairySense User Creation ===" -ForegroundColor Cyan
Write-Host ""

# Test backend health
Write-Host "1. Testing backend connection..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "   ✅ Backend is running: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please start the backend first:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "   Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Get user input
Write-Host ""
Write-Host "2. Enter user details:" -ForegroundColor Yellow
$email = Read-Host "   Email"
$password = Read-Host "   Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# Create user
Write-Host ""
Write-Host "3. Creating user..." -ForegroundColor Yellow
$body = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 10
    
    Write-Host "   ✅ User created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   User ID: $($result.user.id)" -ForegroundColor Cyan
    Write-Host "   Email: $($result.user.email)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ You can now login at http://localhost:5173" -ForegroundColor Green
} catch {
    $errorResponse = $_.ErrorDetails.Message
    try {
        $errorObj = $errorResponse | ConvertFrom-Json
        $errorMessage = $errorObj.error
    } catch {
        $errorMessage = $errorResponse
    }
    
    Write-Host "   ❌ Error: $errorMessage" -ForegroundColor Red
    
    if ($errorMessage -like "*already exists*") {
        Write-Host ""
        Write-Host "   ℹ️  User already exists. You can login directly!" -ForegroundColor Yellow
    } elseif ($errorMessage -like "*timeout*" -or $errorMessage -like "*connection*") {
        Write-Host ""
        Write-Host "   ℹ️  Connection issue. Make sure backend is running and database is connected." -ForegroundColor Yellow
    }
}

Write-Host ""

