# Test user details
$testUser = @{
    email = "admin@example.com"
    password = "admin123"
    name = "Admin User"
    phone = "1234567890"
}

# API endpoint
$apiUrl = "http://localhost:8080/api/v1"

# Check if backend is running
try {
    $healthCheck = Invoke-RestMethod -Uri "$apiUrl/health" -Method Get
    Write-Host "Backend is running and healthy: $($healthCheck.status)"
} catch {
    Write-Host "Backend is not reachable. Please make sure the backend is running."
    exit 1
}

# Create test user
try {
    Write-Host "Creating test user..."
    $body = $testUser | ConvertTo-Json
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$apiUrl/auth/signup" -Method Post -Body $body -Headers $headers -ErrorAction Stop
    Write-Host "Test user created successfully!"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorResponse.message -like "*already exists*") {
            Write-Host "Test user already exists"
        } else {
            Write-Host "Error creating test user: $($errorResponse.message)"
            exit 1
        }
    } else {
        Write-Host "Error creating test user: $($_.Exception.Message)"
        exit 1
    }
}

# Test login
try {
    Write-Host "Testing login..."
    $loginBody = @{
        email = $testUser.email
        password = $testUser.password
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $loginBody -Headers $headers -ErrorAction Stop
    
    if ($response.accessToken) {
        Write-Host "Login successful!"
        Write-Host "Access Token: $($response.accessToken)"
    }
} catch {
    Write-Host "Login test failed: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error details: $($errorResponse.message)"
    }
    exit 1
}

Write-Host ""
Write-Host "Setup completed successfully!"
Write-Host "You can now log in with:"
Write-Host "Email: $($testUser.email)"
Write-Host "Password: $($testUser.password)"
