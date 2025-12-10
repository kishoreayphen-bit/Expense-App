@echo off
echo Installing required dependencies for new features...

call npx expo install expo-document-picker
call npx expo install expo-file-system
call npx expo install expo-sharing

echo.
echo Dependencies installed successfully!
echo.
echo Next steps:
echo 1. Add BillsScreen to your navigation
echo 2. Add search UI to ExpensesScreen
echo 3. Add saved cards UI to payment screen
echo.
echo See MOBILE_UI_IMPLEMENTATION_GUIDE.md for details
pause
