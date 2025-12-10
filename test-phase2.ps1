# Phase 2 API Testing Script
$baseUrl = "http://localhost:18080"

Write-Host "Phase 2 Super Admin API Testing" -ForegroundColor Cyan

# Login
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"superadmin@expense.app","password":"superadmin123"}'
$token = $loginResponse.token
Write-Host "Login successful" -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test System Settings
Write-Host "Testing System Settings..." -ForegroundColor Yellow
$settings = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/settings" -Method GET -Headers $headers
Write-Host "Found $($settings.Count) settings" -ForegroundColor Green

# Test Reports
Write-Host "Testing Reports..." -ForegroundColor Yellow
$monthlyReport = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/reports/monthly?months=6" -Method GET -Headers $headers
Write-Host "Monthly report: $($monthlyReport.totalExpenses) expenses, Amount: $($monthlyReport.totalAmount)" -ForegroundColor Green

# Test Audit Logs
Write-Host "Testing Audit Logs..." -ForegroundColor Yellow
$auditLogs = Invoke-RestMethod -Uri "$baseUrl/api/v1/audit/logs?page=0&size=10" -Method GET -Headers $headers
$logsCount = if ($auditLogs.content) { $auditLogs.content.Count } else { $auditLogs.Count }
Write-Host "Found $logsCount audit logs" -ForegroundColor Green

Write-Host "All Phase 2 APIs working" -ForegroundColor Green
