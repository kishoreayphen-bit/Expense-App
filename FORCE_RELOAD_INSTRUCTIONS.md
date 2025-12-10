# Force Reload Instructions - See the Dark Theme NOW

## The Problem
Your Expo dev server is running but hasn't picked up the theme changes due to caching.

## ✅ Solution: Clear Cache & Reload

### Option 1: In Your Running Expo Terminal (EASIEST)
1. **Find the terminal where Expo is running** (look for "Metro waiting on...")
2. Press **`Shift + R`** (capital R) - This clears cache AND reloads
3. Wait 5-10 seconds for bundle to rebuild
4. Navigate to **Splits → Create Split** in your app

### Option 2: Full Restart (If Option 1 Doesn't Work)
1. **In your Expo terminal**, press **`Ctrl + C`** to stop the server
2. Run: `cd d:\Expenses\mobile`
3. Run: `npm start -- --clear`
4. When it prompts about port 8082, press **`Y`**
5. Scan the QR code again or press **`a`** for Android
6. Navigate to **Splits → Create Split**

### Option 3: From Android Emulator (Fastest)
1. **With app open**, shake the device or press **`Ctrl + M`**
2. Select **"Reload"**
3. If that doesn't work, select **"Debug"** → **"Reload JS"**

### Option 4: Nuclear Option (Guaranteed to Work)
```powershell
# In PowerShell:
cd d:\Expenses\mobile

# Kill any running Metro processes
taskkill /F /IM node.exe

# Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Start fresh
npm start -- --clear
```

## 🎯 What to Look For After Reload

When you open **Splits → Create Split**:

1. **Background**: Should be DARK navy (#0B0F14) not white
2. **Input fields**: Dark gray backgrounds, not white
3. **Next button**: Should be GREEN (or PURPLE in company mode)
4. **Text**: Should be light colored, not dark

## 🔍 Quick Test
Navigate to: **Splits** tab → Tap a group → Tap **"Create Split"**

If you see a **dark screen with a green button**, it's working! ✅

## ⚠️ Still Not Working?

If none of the above work, there might be a TypeScript compilation error. Check:

1. Look in your Expo terminal for any RED error messages
2. Look at the bottom of Expo terminal for "Bundled successfully" message
3. If you see errors, share them with me

## 📱 Current Status

- ✅ Code changes are in the file (verified)
- ✅ Theme system is set up correctly
- ✅ Docker backend is rebuilt
- ⏳ **Metro bundler needs to rebuild** ← This is the blocker

The changes are 100% ready in the code - they just need the JavaScript bundle to refresh!
