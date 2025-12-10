# Test Super Admin Endpoints
$baseUrl = "http://localhost:18080/api/v1"

Write-Host "`n=== Testing Super Admin Endpoints ===" -ForegroundColor Cyan

# Step 1: Login as Super Admin
Write-Host "`n1. Logging in as Super Admin..." -ForegroundColor Yellow
$loginBody = @{
    email = "superadmin@expense.app"
    password = "superadmin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Test Dashboard Stats
Write-Host "`n2. Testing Dashboard Stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard" -Method Get -Headers $headers
    Write-Host "✓ Dashboard stats retrieved" -ForegroundColor Green
    Write-Host "  Total Companies: $($stats.totalCompanies)" -ForegroundColor Gray
    Write-Host "  Active Companies: $($stats.activeCompanies)" -ForegroundColor Gray
    Write-Host "  Total Users: $($stats.totalUsers)" -ForegroundColor Gray
    Write-Host "  Total Expenses: $($stats.totalExpenses)" -ForegroundColor Gray
    Write-Host "  Pending Reimbursements: $($stats.pendingReimbursements)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Dashboard stats failed: $_" -ForegroundColor Red
}

# Step 3: Test Get All Companies
Write-Host "`n3. Testing Get All Companies..." -ForegroundColor Yellow
try {
    $companies = Invoke-RestMethod -Uri "$baseUrl/admin/companies" -Method Get -Headers $headers
    Write-Host "✓ Companies retrieved: $($companies.Count) companies" -ForegroundColor Green
    if ($companies.Count -gt 0) {
        $firstCompany = $companies[0]
        Write-Host "  First company: $($firstCompany.name) (ID: $($firstCompany.id))" -ForegroundColor Gray
        Write-Host "  Status: $($firstCompany.status)" -ForegroundColor Gray
        Write-Host "  Members: $($firstCompany.memberCount)" -ForegroundColor Gray
        Write-Host "  Expenses: $($firstCompany.expenseCount)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Get companies failed: $_" -ForegroundColor Red
}

# Step 4: Test Get All Users
Write-Host "`n4. Testing Get All Users..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$baseUrl/admin/users-summary" -Method Get -Headers $headers
    Write-Host "✓ Users retrieved: $($users.Count) users" -ForegroundColor Green
    if ($users.Count -gt 0) {
        $firstUser = $users[0]
        Write-Host "  First user: $($firstUser.name) ($($firstUser.email))" -ForegroundColor Gray
        Write-Host "  Role: $($firstUser.role)" -ForegroundColor Gray
        Write-Host "  Status: $(if ($firstUser.enabled) { 'Active' } else { 'Suspended' })" -ForegroundColor Gray
        Write-Host "  Companies: $($firstUser.companies.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Get users failed: $_" -ForegroundColor Red
}

# Step 5: Test Get All Claims
Write-Host "`n5. Testing Get All Claims..." -ForegroundColor Yellow
try {
    $claims = Invoke-RestMethod -Uri "$baseUrl/admin/claims" -Method Get -Headers $headers
    Write-Host "✓ Claims retrieved: $($claims.Count) claims" -ForegroundColor Green
    if ($claims.Count -gt 0) {
        $firstClaim = $claims[0]
        Write-Host "  First claim: $($firstClaim.merchant) - $($firstClaim.currency) $($firstClaim.amount)" -ForegroundColor Gray
        Write-Host "  Status: $($firstClaim.reimbursementStatus)" -ForegroundColor Gray
        Write-Host "  User: $($firstClaim.user.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Get claims failed: $_" -ForegroundColor Red
}

# Step 6: Test Get Claims with Status Filter
Write-Host "`n6. Testing Get Pending Claims..." -ForegroundColor Yellow
try {
    $pendingClaims = Invoke-RestMethod -Uri "$baseUrl/admin/claims?status=PENDING" -Method Get -Headers $headers
    Write-Host "✓ Pending claims retrieved: $($pendingClaims.Count) claims" -ForegroundColor Green
} catch {
    Write-Host "✗ Get pending claims failed: $_" -ForegroundColor Red
}

# Step 7: Test Category Stats
Write-Host "`n7. Testing Category Stats..." -ForegroundColor Yellow
try {
    $categoryStats = Invoke-RestMethod -Uri "$baseUrl/admin/stats/categories" -Method Get -Headers $headers
    Write-Host "✓ Category stats retrieved: $($categoryStats.Count) categories" -ForegroundColor Green
    if ($categoryStats.Count -gt 0) {
        Write-Host "  Top 3 categories by expense count:" -ForegroundColor Gray
        $categoryStats | Select-Object -First 3 | ForEach-Object {
            Write-Host "    - $($_.categoryName): $($_.expenseCount) expenses, Total: $($_.totalAmount)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Get category stats failed: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "All Super Admin endpoints tested!" -ForegroundColor Green
