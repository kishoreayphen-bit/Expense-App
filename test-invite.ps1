# Test invitation email sending

Write-Host "🔄 Step 1: Logging in..." -ForegroundColor Cyan

$loginBody = @{
    email = "admin@demo.local"
    password = "admin123"
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
    Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Gray

    Write-Host "`n🔄 Step 2: Sending invitation..." -ForegroundColor Cyan

    $inviteBody = @{
        email = "test@example.com"
        role = "EMPLOYEE"
    } | ConvertTo-Json

    $inviteResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/v1/companies/1/members/invite" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{Authorization="Bearer $token"} `
        -Body $inviteBody `
        -UseBasicParsing

    Write-Host "✅ Invitation sent successfully!" -ForegroundColor Green
    Write-Host "Response: $($inviteResponse.Content)" -ForegroundColor Gray

    Write-Host "`n🎉 SUCCESS! Check the following:" -ForegroundColor Green
    Write-Host "1. Backend logs: docker-compose logs backend --tail=50" -ForegroundColor Yellow
    Write-Host "2. Ethereal inbox: https://ethereal.email/login" -ForegroundColor Yellow
    Write-Host "   Username: dagmar.zieme49@ethereal.email" -ForegroundColor Gray
    Write-Host "   Password: MQsz7yuY8RaEdcs2Vg" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
