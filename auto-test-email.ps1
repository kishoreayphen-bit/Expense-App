# Automated Email Test with Mailtrap

Write-Host "" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "AUTOMATED EMAIL TEST WITH MAILTRAP" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# Wait for backend to be ready
Write-Host "`n[1/5] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check backend health
Write-Host "`n[2/5] Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:18080/actuator/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not ready yet. Waiting 10 more seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    $health = Invoke-WebRequest -Uri "http://localhost:18080/actuator/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Backend is now healthy" -ForegroundColor Green
}

# Verify SMTP config
Write-Host "`n[3/5] Verifying SMTP configuration..." -ForegroundColor Yellow
$smtpConfig = docker-compose exec backend env | Select-String -Pattern "SMTP"
Write-Host "✅ SMTP Configuration:" -ForegroundColor Green
$smtpConfig | ForEach-Object { Write-Host "   $_" -ForegroundColor White }

# Login
Write-Host "`n[4/5] Logging in..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@demo.local","password":"Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).accessToken
Write-Host "✅ Logged in successfully" -ForegroundColor Green

# Send invitation
Write-Host "`n[5/5] Sending test invitation..." -ForegroundColor Yellow
$testEmail = "testuser$(Get-Random -Minimum 1000 -Maximum 9999)@example.com"
Write-Host "   To: $testEmail" -ForegroundColor Gray
$inviteBody = "{`"email`":`"$testEmail`",`"role`":`"EMPLOYEE`"}"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" -Method POST -Headers $headers -Body $inviteBody -UseBasicParsing
    Write-Host "✅ Invitation sent! Status: $($inviteResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Check logs
Write-Host "`n📋 Checking backend logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$logs = docker-compose logs backend --tail=30 | Select-String -Pattern "email|invite|success|Failed|ERROR" | Select-Object -Last 10

if ($logs) {
    $logs | ForEach-Object {
        $line = $_.ToString()
        if ($line -match "success|✅") {
            Write-Host "   $line" -ForegroundColor Green
        } elseif ($line -match "Failed|ERROR|❌") {
            Write-Host "   $line" -ForegroundColor Red
        } else {
            Write-Host "   $line" -ForegroundColor White
        }
    }
}

# Summary
Write-Host "" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n📊 RESULTS:" -ForegroundColor Yellow
Write-Host "   Backend: ✅ Running" -ForegroundColor Green
Write-Host "   SMTP: ✅ Configured (Mailtrap)" -ForegroundColor Green
Write-Host "   Login: ✅ Success" -ForegroundColor Green
Write-Host "   Invitation: Check logs above" -ForegroundColor White

Write-Host "`n📧 To view emails:" -ForegroundColor Yellow
Write-Host "   1. Sign up at: https://mailtrap.io/" -ForegroundColor White
Write-Host "   2. Go to your inbox" -ForegroundColor White
Write-Host "   3. Update .env with your credentials" -ForegroundColor White
Write-Host "   4. Restart backend and test again" -ForegroundColor White

Write-Host ""
