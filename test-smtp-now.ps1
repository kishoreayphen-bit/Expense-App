# Simple SMTP Test Script

Write-Host "Testing Gmail SMTP..." -ForegroundColor Cyan

# Check backend config
Write-Host "`n[1] Backend SMTP Config:" -ForegroundColor Yellow
docker-compose exec backend env | Select-String -Pattern "SMTP|FROM_EMAIL"

# Login
Write-Host "`n[2] Logging in..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@demo.local","password":"Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).accessToken
Write-Host "Logged in successfully" -ForegroundColor Green
Write-Host "Token received: $($token.Length) characters" -ForegroundColor Gray

# Send invitation
Write-Host "`n[3] Sending invitation..." -ForegroundColor Yellow
Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Gray
$inviteBody = '{"email":"test@example.com","role":"EMPLOYEE"}'
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" -Method POST -Headers $headers -Body $inviteBody -UseBasicParsing
    Write-Host "Invitation sent! Status: $($inviteResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Check logs
Write-Host "`n[4] Backend logs:" -ForegroundColor Yellow
Start-Sleep -Seconds 2
docker-compose logs backend --tail=30 | Select-String -Pattern "email|invite|Authentication|Failed|ERROR" | Select-Object -Last 10

Write-Host "`nCheck Gmail: https://mail.google.com (kishore.ayphen@gmail.com)" -ForegroundColor Cyan
