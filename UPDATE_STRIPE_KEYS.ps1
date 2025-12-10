# Stripe Keys Update Script
# Run this after you get your keys from https://dashboard.stripe.com/test/apikeys

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   STRIPE KEYS UPDATE SCRIPT" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 1: Get your Stripe keys" -ForegroundColor Yellow
Write-Host "Go to: https://dashboard.stripe.com/test/apikeys" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter when you have your keys ready..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "STEP 2: Enter your Stripe Secret Key" -ForegroundColor Yellow
Write-Host "(starts with sk_test_)" -ForegroundColor Gray
$secretKey = Read-Host "Secret Key"

Write-Host ""
Write-Host "STEP 3: Enter your Stripe Publishable Key" -ForegroundColor Yellow
Write-Host "(starts with pk_test_)" -ForegroundColor Gray
$publishableKey = Read-Host "Publishable Key"

Write-Host ""
Write-Host "Updating .env file..." -ForegroundColor Cyan

# Read the .env file
$envPath = "d:\Expenses\.env"
$content = Get-Content $envPath -Raw

# Replace the keys
$content = $content -replace 'STRIPE_SECRET_KEY=sk_test_your_secret_key_here', "STRIPE_SECRET_KEY=$secretKey"
$content = $content -replace 'STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here', "STRIPE_PUBLISHABLE_KEY=$publishableKey"

# Save the file
Set-Content -Path $envPath -Value $content -NoNewline

Write-Host "✓ .env file updated!" -ForegroundColor Green
Write-Host ""

Write-Host "STEP 4: Restarting backend..." -ForegroundColor Yellow
Set-Location "d:\Expenses"
docker-compose restart backend

Write-Host ""
Write-Host "Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your Stripe keys have been configured!" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open your mobile app" -ForegroundColor White
Write-Host "2. Go to Splits → Auto Split" -ForegroundColor White
Write-Host "3. Click 'Pay Now'" -ForegroundColor White
Write-Host "4. Payment screen should open!" -ForegroundColor White
Write-Host ""
Write-Host "Test card: 4242 4242 4242 4242" -ForegroundColor Cyan
Write-Host ""
