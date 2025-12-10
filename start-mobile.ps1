# Start the mobile app from the mobile directory
Set-Location -Path "$PSScriptRoot\mobile"

# Find an available port starting from 8081
$port = 8081
$maxPort = 8090

while ($port -le $maxPort) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    if (-not $connection.TcpTestSucceeded) {
        Write-Host "Starting Expo server on port $port"
        npx expo start --port $port
        break
    }
    $port++
}

if ($port -gt $maxPort) {
    Write-Error "No available ports found between 8081 and $maxPort"
}
