# Test Mailtrap SMTP

Write-Host "Testing Mailtrap SMTP..." -ForegroundColor Cyan

# Wait for backend
Write-Host "Waiting for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check health
Write-Host "Checking backend health..." -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "http://localhost:18080/actuator/health" -UseBasicParsing
Write-Host "Backend is healthy" -ForegroundColor Green

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@demo.local","password":"Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).accessToken
Write-Host "Logged in" -ForegroundColor Green

# Send invitation
Write-Host "Sending invitation..." -ForegroundColor Yellow
$testEmail = "testuser@example.com"
$inviteBody = "{`"email`":`"$testEmail`",`"role`":`"EMPLOYEE`"}"
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}

try {
    $inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" -Method POST -Headers $headers -Body $inviteBody -UseBasicParsing
    Write-Host "Invitation sent! Status: $($inviteResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Check logs
Write-Host "Checking logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
docker-compose logs backend --tail=20 | Select-String -Pattern "email|success|Failed" | Select-Object -Last 5

Write-Host "Done!" -ForegroundColor Cyan
