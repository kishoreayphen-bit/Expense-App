# Test Gmail SMTP Configuration

Write-Host "`n" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "TESTING GMAIL SMTP CONFIGURATION" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# Step 1: Verify backend environment
Write-Host "`n[1/5] Checking backend SMTP configuration..." -ForegroundColor Yellow
$smtpConfig = docker-compose exec backend env 2>&1 | Select-String -Pattern "SMTP|FROM_EMAIL"

if ($smtpConfig) {
    Write-Host "✅ Backend SMTP Configuration:" -ForegroundColor Green
    $smtpConfig | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
} else {
    Write-Host "❌ Failed to read backend configuration!" -ForegroundColor Red
    exit 1
}

# Step 2: Check if backend is healthy
Write-Host "`n[2/5] Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:18080/actuator/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is healthy (Status: $($health.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not responding!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Login
Write-Host "`n[3/5] Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@demo.local"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Send test invitation
Write-Host "`n[4/5] Sending test invitation..." -ForegroundColor Yellow

$inviteBody = @{
    email = "test@example.com"
    role = "EMPLOYEE"
} | ConvertTo-Json

Write-Host "   To: test@example.com" -ForegroundColor Gray
Write-Host "   Role: EMPLOYEE" -ForegroundColor Gray
Write-Host "   Company ID: 1" -ForegroundColor Gray

try {
    $inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{Authorization="Bearer $token"} `
        -Body $inviteBody `
        -UseBasicParsing

    Write-Host "`n✅ Invitation API call successful!" -ForegroundColor Green
    Write-Host "   Status: $($inviteResponse.StatusCode) $($inviteResponse.StatusDescription)" -ForegroundColor Gray
} catch {
    Write-Host "`n❌ Invitation API call failed!" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# Step 5: Check backend logs
Write-Host "`n[5/5] Checking backend logs for email sending..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$emailLogs = docker-compose logs backend --tail=50 2>&1 | Select-String -Pattern "email|Authentication|Failed|ERROR" | Select-Object -Last 15

if ($emailLogs) {
    Write-Host "`n📋 Recent email-related logs:" -ForegroundColor Cyan
    $emailLogs | ForEach-Object { 
        $line = $_.ToString()
        if ($line -match "success") {
            Write-Host "   $line" -ForegroundColor Green
        } elseif ($line -match "ERROR|Failed|Authentication") {
            Write-Host "   $line" -ForegroundColor Red
        } else {
            Write-Host "   $line" -ForegroundColor White
        }
    }
} else {
    Write-Host "   No email-related logs found" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n📧 Check Gmail:" -ForegroundColor Yellow
Write-Host "   1. Go to: https://mail.google.com" -ForegroundColor White
Write-Host "   2. Login: kishore.ayphen@gmail.com" -ForegroundColor White
Write-Host "   3. Check 'Sent' folder for invitation email" -ForegroundColor White
Write-Host "   4. If sent to test@example.com, check that inbox (including spam)" -ForegroundColor White

Write-Host "`n📋 View full logs:" -ForegroundColor Yellow
Write-Host "   docker-compose logs backend -f" -ForegroundColor White

Write-Host "`n"
