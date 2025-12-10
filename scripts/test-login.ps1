$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    email = "test@example.com"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" \
        -Method Post \
        -Headers $headers \
        -Body $body
    
    Write-Host "Login successful!"
    Write-Host "Access Token: $($response.accessToken)"
    Write-Host "Refresh Token: $($response.refreshToken)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
