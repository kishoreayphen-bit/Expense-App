$baseUrl = "http://localhost:18080"

Write-Host "Testing Claim Approval..." -ForegroundColor Cyan

# Login
$loginBody = '{"email":"admin@demo.local","password":"password"}'
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.token
Write-Host "Logged in as admin" -ForegroundColor Green

# Get pending
$pending = Invoke-RestMethod -Uri "$baseUrl/api/v1/reimbursements/pending?companyId=1" -Method GET -Headers @{"Authorization"="Bearer $token"}
Write-Host "Found $($pending.Count) pending claims" -ForegroundColor Green

if ($pending.Count -gt 0) {
    $expenseId = $pending[0].id
    Write-Host "Testing approval of expense ID: $expenseId" -ForegroundColor Yellow
    
    # Try to approve
    try {
        $approveBody = '{"notes":"Test approval"}'
        $result = Invoke-RestMethod -Uri "$baseUrl/api/v1/reimbursements/$expenseId/approve" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $approveBody
        Write-Host "SUCCESS! Approved expense $expenseId" -ForegroundColor Green
    } catch {
        Write-Host "FAILED to approve!" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}
