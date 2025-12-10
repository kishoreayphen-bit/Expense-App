# Test Reimbursement Listing Issue
# This script helps debug why expenses aren't showing in admin's Claims tab

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "REIMBURSEMENT DEBUG TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:18080"

# Step 1: Login as superadmin
Write-Host "Step 1: Login as superadmin@expense.app..." -ForegroundColor Yellow
$loginBody = @{
    email = "superadmin@expense.app"
    password = "password"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $superadminToken = $loginData.token
    Write-Host "✓ Superadmin logged in" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get superadmin's companies
Write-Host "`nStep 2: Get superadmin's companies..." -ForegroundColor Yellow
try {
    $companiesResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/companies" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $superadminToken" } `
        -UseBasicParsing
    
    $companies = $companiesResponse.Content | ConvertFrom-Json
    Write-Host "✓ Found $($companies.Count) company/companies" -ForegroundColor Green
    
    if ($companies.Count -eq 0) {
        Write-Host "✗ No companies found! Please create a company first." -ForegroundColor Red
        exit 1
    }
    
    $companyId = $companies[0].id
    $companyName = $companies[0].name
    Write-Host "  Using Company: $companyName (ID: $companyId)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed to get companies: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Get superadmin's expenses for this company
Write-Host "`nStep 3: Get superadmin's expenses for company $companyId..." -ForegroundColor Yellow
try {
    $expensesResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/expenses?companyId=$companyId" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $superadminToken" } `
        -UseBasicParsing
    
    $expenses = $expensesResponse.Content | ConvertFrom-Json
    Write-Host "✓ Found $($expenses.Count) expense(s)" -ForegroundColor Green
    
    # Find reimbursable expenses
    $reimbursableExpenses = $expenses | Where-Object { $_.isReimbursable -eq $true }
    Write-Host "  Reimbursable expenses: $($reimbursableExpenses.Count)" -ForegroundColor Cyan
    
    foreach ($exp in $reimbursableExpenses) {
        Write-Host "    - ID: $($exp.id), Merchant: $($exp.merchant), Amount: $($exp.currency) $($exp.amount)" -ForegroundColor Gray
        Write-Host "      CompanyId: $($exp.companyId), Status: $($exp.reimbursementStatus)" -ForegroundColor Gray
    }
    
    if ($reimbursableExpenses.Count -eq 0) {
        Write-Host "`n⚠ No reimbursable expenses found!" -ForegroundColor Yellow
        Write-Host "  Please create a reimbursable expense first:" -ForegroundColor Yellow
        Write-Host "  1. Login as superadmin@expense.app" -ForegroundColor Yellow
        Write-Host "  2. Switch to company mode" -ForegroundColor Yellow
        Write-Host "  3. Add expense with 'Reimbursable' toggle ON" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if any have PENDING status
    $pendingExpenses = $reimbursableExpenses | Where-Object { $_.reimbursementStatus -eq "PENDING" }
    Write-Host "`n  Pending reimbursement requests: $($pendingExpenses.Count)" -ForegroundColor Cyan
    
} catch {
    Write-Host "✗ Failed to get expenses: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Login as admin
Write-Host "`nStep 4: Login as admin..." -ForegroundColor Yellow
Write-Host "  Enter admin email (e.g., admin@expense.app): " -ForegroundColor Cyan -NoNewline
$adminEmail = Read-Host
Write-Host "  Enter admin password: " -ForegroundColor Cyan -NoNewline
$adminPassword = Read-Host -AsSecureString
$adminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword))

$adminLoginBody = @{
    email = $adminEmail
    password = $adminPasswordPlain
} | ConvertTo-Json

try {
    $adminLoginResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $adminLoginBody `
        -UseBasicParsing
    
    $adminLoginData = $adminLoginResponse.Content | ConvertFrom-Json
    $adminToken = $adminLoginData.token
    Write-Host "✓ Admin logged in" -ForegroundColor Green
} catch {
    Write-Host "✗ Admin login failed: $_" -ForegroundColor Red
    Write-Host "  Make sure the admin is a member of the company!" -ForegroundColor Yellow
    exit 1
}

# Step 5: Get pending reimbursements as admin
Write-Host "`nStep 5: Get pending reimbursements as admin..." -ForegroundColor Yellow
try {
    $pendingResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/reimbursements/pending?companyId=$companyId" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $adminToken" } `
        -UseBasicParsing
    
    $pendingReimbursements = $pendingResponse.Content | ConvertFrom-Json
    Write-Host "✓ Found $($pendingReimbursements.Count) pending reimbursement(s)" -ForegroundColor Green
    
    if ($pendingReimbursements.Count -eq 0) {
        Write-Host "`n⚠ NO PENDING REIMBURSEMENTS FOUND!" -ForegroundColor Red
        Write-Host "`nDEBUG INFO:" -ForegroundColor Yellow
        Write-Host "  - Superadmin has $($reimbursableExpenses.Count) reimbursable expense(s)" -ForegroundColor Yellow
        Write-Host "  - But admin sees 0 pending reimbursements" -ForegroundColor Yellow
        Write-Host "`nPOSSIBLE CAUSES:" -ForegroundColor Yellow
        Write-Host "  1. Expenses don't have companyId set" -ForegroundColor Yellow
        Write-Host "  2. Reimbursement status is not 'PENDING'" -ForegroundColor Yellow
        Write-Host "  3. Admin doesn't have permission (not ADMIN/MANAGER role)" -ForegroundColor Yellow
        Write-Host "`nCHECK BACKEND LOGS:" -ForegroundColor Cyan
        Write-Host "  docker logs expense_backend --tail 50 | Select-String 'ReimbursementService'" -ForegroundColor Gray
    } else {
        Write-Host "`n✓ SUCCESS! Admin can see reimbursements:" -ForegroundColor Green
        foreach ($reimb in $pendingReimbursements) {
            Write-Host "  - ID: $($reimb.id), Merchant: $($reimb.merchant), Amount: $($reimb.currency) $($reimb.amount)" -ForegroundColor Cyan
            Write-Host "    User: $($reimb.user.email), Status: $($reimb.reimbursementStatus)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Failed to get pending reimbursements: $_" -ForegroundColor Red
    $errorDetails = $_.Exception.Response
    if ($errorDetails) {
        $reader = New-Object System.IO.StreamReader($errorDetails.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error details: $responseBody" -ForegroundColor Red
    }
    Write-Host "`nPOSSIBLE CAUSES:" -ForegroundColor Yellow
    Write-Host "  1. Admin is not a member of company ID $companyId" -ForegroundColor Yellow
    Write-Host "  2. Admin doesn't have ADMIN/MANAGER role" -ForegroundColor Yellow
    Write-Host "  3. Permission check failed" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
