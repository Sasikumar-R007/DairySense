# Quick script to URL-encode your database password
# Usage: .\encode-password.ps1 "your-password-here"

param(
    [Parameter(Mandatory=$true)]
    [string]$Password
)

Add-Type -AssemblyName System.Web
$encoded = [System.Web.HttpUtility]::UrlEncode($Password)
Write-Host "`nOriginal password: $Password" -ForegroundColor Yellow
Write-Host "URL-encoded: $encoded" -ForegroundColor Green
Write-Host "`nUse this in your connection string!" -ForegroundColor Cyan

