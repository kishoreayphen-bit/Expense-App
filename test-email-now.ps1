# Simple email test script

Write-Host "`nTesting Email Sending..." -ForegroundColor Cyan

# Login
$loginBody = @{
    email = "admin@demo.local"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

Write-Host "Logged in successfully" -ForegroundColor Green

# Send invitation
$inviteBody = @{
    email = "test@example.com"
    role = "EMPLOYEE"
} | ConvertTo-Json

Write-Host "Sending invitation to test@example.com..." -ForegroundColor Yellow

$inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body $inviteBody -UseBasicParsing

Write-Host "Invitation sent! Status: $($inviteResponse.StatusCode)" -ForegroundColor Green

Write-Host "`nCheck Ethereal:" -ForegroundColor Cyan
Write-Host "URL: https://ethereal.email/login"
Write-Host "User: agzkqvswjvjzyflk@ethereal.email"
Write-Host "Pass: ZCbj8RnE389shzSuyJ"
Write-Host "`nCheck backend logs:" -ForegroundColor Cyan
Write-Host "docker-compose logs backend --tail=20"
