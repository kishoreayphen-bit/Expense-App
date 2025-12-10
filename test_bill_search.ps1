# Test bill search endpoint
Write-Host "Testing bill search API..." -ForegroundColor Cyan

# First, get a token by logging in
$loginBody = @{
    email = "admin@demo.local"
    password = "admin123"
} | ConvertTo-Json

Write-Host "`nStep 1: Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:18080/api/v1/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.accessToken
    Write-Host "✅ Login successful! Got token: $($token.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Now test bill search
Write-Host "`nStep 2: Testing bill search..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $searchResponse = Invoke-RestMethod -Uri "http://localhost:18080/api/v1/bills/search?billNumber=001&companyId=1" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ Bill search successful!" -ForegroundColor Green
    Write-Host "Response: $($searchResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
    if ($searchResponse.Count -eq 0) {
        Write-Host "`n⚠️  No bills found with number '001'. This is OK if you haven't uploaded any bills yet." -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Found $($searchResponse.Count) bill(s)!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Bill search failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "`n❌ 500 ERROR - Backend SQL query still has syntax error!" -ForegroundColor Red
        Write-Host "Checking backend logs..." -ForegroundColor Yellow
        docker logs expense_backend --tail 50 | Select-String "ERROR|Exception" -Context 2
    }
    exit 1
}

Write-Host "`n✅ ALL TESTS PASSED!" -ForegroundColor Green
