#!/bin/bash

echo "📦 Installing required dependencies for new features..."

# Install expo packages
npx expo install expo-document-picker
npx expo install expo-file-system
npx expo install expo-sharing

echo "✅ Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Add BillsScreen to your navigation"
echo "2. Add search UI to ExpensesScreen"
echo "3. Add saved cards UI to payment screen"
echo ""
echo "See MOBILE_UI_IMPLEMENTATION_GUIDE.md for details"
