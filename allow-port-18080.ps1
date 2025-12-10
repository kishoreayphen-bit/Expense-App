# Allow port 18080 through Windows Firewall for Expense App
# Run this script as Administrator

Write-Host "Creating firewall rule to allow port 18080..." -ForegroundColor Yellow

try {
    # Check if rule already exists
    $existingRule = Get-NetFirewallRule -DisplayName "Expense App Backend - Port 18080" -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "Firewall rule already exists. Removing old rule..." -ForegroundColor Cyan
        Remove-NetFirewallRule -DisplayName "Expense App Backend - Port 18080"
    }
    
    # Create new inbound rule for port 18080
    New-NetFirewallRule `
        -DisplayName "Expense App Backend - Port 18080" `
        -Description "Allow inbound connections to Expense App backend on port 18080" `
        -Direction Inbound `
        -LocalPort 18080 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -Enabled True
    
    Write-Host "✓ Firewall rule created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Port 18080 is now accessible from your local network." -ForegroundColor Green
    Write-Host "You can now connect from your phone using: http://10.10.98.78:18080" -ForegroundColor Cyan
    
} catch {
    Write-Host "✗ Error creating firewall rule: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please make sure you're running this script as Administrator." -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
