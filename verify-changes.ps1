# Verification Script for Theme Modernization
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "THEME MODERNIZATION VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allPassed = $true

# Check 1: Theme tokens file
Write-Host "[1/10] Checking theme/tokens.ts..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\theme\tokens.ts") {
    $content = Get-Content "d:\Expenses\mobile\src\theme\tokens.ts" -Raw
    if ($content -match "userColors" -and $content -match "companyColors" -and $content -match "getThemeColors") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Missing color palettes" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 2: ThemeView component
Write-Host "[2/10] Checking components/ThemeView.tsx..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\components\ThemeView.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\components\ThemeView.tsx" -Raw
    if ($content -match "useTheme" -and $content -match "ThemeView") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Missing exports" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 3: ModeIndicator component
Write-Host "[3/10] Checking components/ModeIndicator.tsx..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\components\ModeIndicator.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\components\ModeIndicator.tsx" -Raw
    if ($content -match "ModeIndicator" -and $content -match "COMPANY" -and $content -match "PERSONAL") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Missing mode labels" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 4: ThemedButton component
Write-Host "[4/10] Checking components/ThemedButton.tsx..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\components\ThemedButton.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\components\ThemedButton.tsx" -Raw
    if ($content -match "ThemedButton" -and $content -match "variant") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Missing variant prop" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 5: SplitCreateScreen updated
Write-Host "[5/10] Checking SplitCreateScreen.tsx integration..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\screens\SplitCreateScreen.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\screens\SplitCreateScreen.tsx" -Raw
    if ($content -match "useTheme" -and $content -match "theme\.primary" -and $content -match "#0B0F14") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Theme not applied" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 6: DashboardScreen updated
Write-Host "[6/10] Checking DashboardScreen.tsx integration..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\screens\DashboardScreen.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\screens\DashboardScreen.tsx" -Raw
    if ($content -match "useTheme" -and $content -match "const \{ theme \}") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Theme hook not used" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 7: ExpensesScreen updated
Write-Host "[7/10] Checking ExpensesScreen.tsx integration..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\screens\ExpensesScreen.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\screens\ExpensesScreen.tsx" -Raw
    if ($content -match "useTheme" -and $content -match "const \{ theme") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Theme hook not used" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 8: BudgetsScreen updated
Write-Host "[8/10] Checking BudgetsScreen.tsx integration..." -NoNewline
if (Test-Path "d:\Expenses\mobile\src\screens\BudgetsScreen.tsx") {
    $content = Get-Content "d:\Expenses\mobile\src\screens\BudgetsScreen.tsx" -Raw
    if ($content -match "getThemeColors" -and $content -match "const theme") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Theme not integrated" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Check 9: Documentation exists
Write-Host "[9/10] Checking documentation files..." -NoNewline
if ((Test-Path "d:\Expenses\THEME_MODERNIZATION.md") -and (Test-Path "d:\Expenses\MODERNIZATION_EXAMPLES.md")) {
    Write-Host " ✓ PASS" -ForegroundColor Green
} else {
    Write-Host " ✗ FAIL - Documentation missing" -ForegroundColor Red
    $allPassed = $false
}

# Check 10: Backend notification fix
Write-Host "[10/10] Checking backend notification fix..." -NoNewline
if (Test-Path "d:\Expenses\backend\src\main\java\com\expenseapp\notification\NotificationRepository.java") {
    $content = Get-Content "d:\Expenses\backend\src\main\java\com\expenseapp\notification\NotificationRepository.java" -Raw
    if ($content -match "data::text" -and $content -match "countByUserAndTypeAndTitleAndBudgetId") {
        Write-Host " ✓ PASS" -ForegroundColor Green
    } else {
        Write-Host " ✗ FAIL - Notification dedup not fixed" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host " ✗ FAIL - File not found" -ForegroundColor Red
    $allPassed = $false
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✓ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Reload your React Native app (press 'r' in Expo terminal)" -ForegroundColor White
    Write-Host "2. Navigate to any Split screen to see dark theme" -ForegroundColor White
    Write-Host "3. Primary button will be GREEN (user mode) or PURPLE (company mode)" -ForegroundColor White
} else {
    Write-Host "SOME CHECKS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please review the failures above." -ForegroundColor Yellow
}
Write-Host ""
