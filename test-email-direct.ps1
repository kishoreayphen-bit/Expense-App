# Direct test of email sending via backend API

Write-Host "`n🔄 Testing Email Sending Directly..." -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray

# Step 1: Login
Write-Host "`n📝 Step 1: Logging in..." -ForegroundColor Yellow

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

    # Step 2: Send invitation
    Write-Host "`n📧 Step 2: Sending invitation email..." -ForegroundColor Yellow

    $inviteBody = @{
        email = "test@example.com"
        role = "EMPLOYEE"
    } | ConvertTo-Json

    Write-Host "   To: test@example.com" -ForegroundColor Gray
    Write-Host "   Role: EMPLOYEE" -ForegroundColor Gray

    $inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{Authorization="Bearer $token"} `
        -Body $inviteBody `
        -UseBasicParsing

    Write-Host "`n✅ Invitation API call successful!" -ForegroundColor Green
    Write-Host "   Response: $($inviteResponse.StatusCode) $($inviteResponse.StatusDescription)" -ForegroundColor Gray

    # Step 3: Check logs
    Write-Host "`n📋 Step 3: Checking backend logs..." -ForegroundColor Yellow
    Write-Host "   Looking for email sending confirmation..." -ForegroundColor Gray

    Start-Sleep -Seconds 2

    $logs = docker-compose logs backend --tail=50 2>&1 | Select-String -Pattern "📧|✅|❌|Authentication" | Select-Object -Last 10

    if ($logs) {
        Write-Host "`n   Recent email-related logs:" -ForegroundColor Gray
        $logs | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
    }

    # Step 4: Instructions
    Write-Host "`n" -NoNewline
    Write-Host "=" * 70 -ForegroundColor Gray
    Write-Host "`n🎉 SUCCESS! Now check Ethereal:" -ForegroundColor Green
    Write-Host "`n   1. Go to: " -NoNewline -ForegroundColor Yellow
    Write-Host "https://ethereal.email/login" -ForegroundColor Cyan
    Write-Host "   2. Username: " -NoNewline -ForegroundColor Yellow
    Write-Host "agzkqvswjvjzyflk@ethereal.email" -ForegroundColor White
    Write-Host "   3. Password: " -NoNewline -ForegroundColor Yellow
    Write-Host "ZCbj8RnE389shzSuyJ" -ForegroundColor White
    Write-Host "   4. Click 'Messages' tab" -ForegroundColor Yellow
    Write-Host "   5. Look for email to: test@example.com" -ForegroundColor Yellow
    Write-Host "`n" -NoNewline

} catch {
    Write-Host "`n❌ Error occurred!" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
    
    Write-Host "`n📋 Checking backend logs for errors..." -ForegroundColor Yellow
    $errorLogs = docker-compose logs backend --tail=30 2>&1 | Select-String -Pattern "ERROR|Exception|Authentication" | Select-Object -Last 5
    if ($errorLogs) {
        $errorLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
}
