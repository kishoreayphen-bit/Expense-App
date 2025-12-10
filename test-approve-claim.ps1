# Test Approve/Reject Claim Functionality
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST APPROVE/REJECT CLAIM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:18080"

# Login as admin
Write-Host "Step 1: Login as admin..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@demo.local"
    password = "password"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✓ Admin logged in" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Get pending reimbursements
Write-Host "`nStep 2: Get pending reimbursements..." -ForegroundColor Yellow
try {
    $pendingResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/reimbursements/pending?companyId=1" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -UseBasicParsing
    
    $pending = $pendingResponse.Content | ConvertFrom-Json
    Write-Host "✓ Found $($pending.Count) pending claim(s)" -ForegroundColor Green
    
    if ($pending.Count -eq 0) {
        Write-Host "✗ No pending claims to test!" -ForegroundColor Red
        exit 1
    }
    
    # Show claims
    foreach ($claim in $pending) {
        Write-Host "  - ID: $($claim.id), User: $($claim.user.email), Amount: $($claim.currency) $($claim.amount)" -ForegroundColor Cyan
    }
    
    $testExpenseId = $pending[0].id
    Write-Host "`nUsing Expense ID: $testExpenseId for testing" -ForegroundColor Yellow
    
} catch {
    Write-Host "✗ Failed to get pending claims: $_" -ForegroundColor Red
    exit 1
}

# Test Approve
Write-Host "`nStep 3: Test APPROVE endpoint..." -ForegroundColor Yellow
$approveBody = @{
    notes = "Test approval from script"
} | ConvertTo-Json

try {
    $approveResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/reimbursements/$testExpenseId/approve" `
        -Method POST `
        -Headers @{ 
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -Body $approveBody `
        -UseBasicParsing
    
    Write-Host "✓ Approve endpoint responded: $($approveResponse.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($approveResponse.Content)" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Approve failed!" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
