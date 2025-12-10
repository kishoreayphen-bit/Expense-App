# Test Budget Alerts Endpoint
Write-Host "`n=== Testing Budget Alerts Endpoint ===" -ForegroundColor Cyan

# You need to replace this with your actual JWT token
$token = Read-Host "Enter your JWT token (from app login)"

if (!$token) {
    Write-Host "Error: Token required" -ForegroundColor Red
    exit 1
}

$period = (Get-Date -Format "yyyy-MM")
$url = "http://localhost:18080/api/v1/budgets/check-alerts?period=$period"

Write-Host "`nCalling: $url" -ForegroundColor Yellow
Write-Host "Period: $period`n" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method POST `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -UseBasicParsing

    Write-Host "✓ SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
    
} catch {
    Write-Host "✗ FAILED!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nCheck backend logs with:" -ForegroundColor Yellow
Write-Host "docker logs expense_backend --tail 50" -ForegroundColor White
