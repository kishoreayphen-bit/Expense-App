# 🔧 Network Error Troubleshooting - Bill Search

## ❌ Error Message
```
ERROR [API] Request failed: GET /api/v1/bills/search?billNumber=001
{"code": "ERR_NETWORK", "message": "Network Error"}
```

## 🔍 Root Cause

**"Network Error" means the mobile app cannot reach the backend server at all.**

This is NOT a code issue - it's a connectivity problem between your mobile device and the backend.

---

## ✅ **FIXES APPLIED**

### 1. Added `companyId` to Bill Search ✅
**File:** `mobile/src/screens/AddExpenseScreen.tsx`

**Change:**
```typescript
// BEFORE:
const bills = await BillService.searchBills({ billNumber: trimmedBillNumber });

// AFTER:
const searchFilters: any = { billNumber: trimmedBillNumber };
if (isCompanyMode && activeCompanyId) {
  searchFilters.companyId = Number(activeCompanyId);
}
const bills = await BillService.searchBills(searchFilters);
```

**Why:** Company mode requires companyId to filter bills correctly

---

## 🔧 **TROUBLESHOOTING STEPS**

### Step 1: Check if Backend is Running ✅
```bash
docker ps | findstr expense_backend
```

**Expected Output:**
```
expense_backend   Up   0.0.0.0:18080->8080/tcp
```

**Status:** ✅ Backend is running and exposed on port 18080

---

### Step 2: Identify Your Device Type

**Are you using:**

#### Option A: Android Emulator (AVD) 🟢
**Current API Base URL:** `http://10.0.2.2:18080` ✅ **CORRECT**
- `10.0.2.2` is the special IP that maps to `localhost` on your PC
- This should work out of the box

**Test from emulator:**
```bash
# From Android Studio Terminal in emulator:
adb shell
ping 10.0.2.2
```

#### Option B: Physical Android Device / iOS 🔴
**Current API Base URL:** `http://10.0.2.2:18080` ❌ **WRONG**
- Physical devices cannot use `10.0.2.2`
- You need your computer's actual IP address

**Fix Required:** Change API URL to your computer's IP

---

### Step 3: Get Your Computer's IP Address

**On Windows (PowerShell):**
```powershell
ipconfig | findstr IPv4
```

**Look for something like:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

**Common IP ranges:**
- `192.168.x.x` - Home WiFi
- `10.x.x.x` - Corporate network
- `172.16.x.x` - Some networks

---

### Step 4: Update Mobile App URL (If Using Physical Device)

#### Option A: Environment Variable
1. Open `mobile/.env` or `mobile/app.config.js`
2. Change:
```javascript
// FROM:
API_URL: 'http://10.0.2.2:18080'

// TO (use your actual IP):
API_URL: 'http://192.168.1.100:18080'
```

#### Option B: Login Screen
1. Open the mobile app
2. Go to Login screen
3. Look for "API URL" or "Server URL" setting
4. Change to: `http://192.168.1.100:18080` (use YOUR IP)

#### Option C: Code Change
**File:** `mobile/src/api/client.ts` (Line 19)
```typescript
// FROM:
let API_BASE_URL = 'http://10.0.2.2:18080';

// TO (use your IP):
let API_BASE_URL = 'http://192.168.1.100:18080';
```

**After changing:**
```bash
cd mobile
npm start -- --reset-cache
```

---

### Step 5: Check Firewall

**Windows Firewall might block port 18080**

#### Allow Port 18080:
```powershell
# Run as Administrator:
New-NetFirewallRule -DisplayName "Expense Backend" -Direction Inbound -LocalPort 18080 -Protocol TCP -Action Allow
```

#### Or Temporarily Disable Firewall:
1. Windows Settings → Privacy & Security → Windows Security
2. Firewall & network protection
3. Turn off (for testing only!)
4. Try bill search again
5. Turn firewall back on
6. If it works, add firewall rule above

---

### Step 6: Verify Backend is Accessible

#### From Your Computer:
```powershell
Invoke-WebRequest -Uri "http://localhost:18080/actuator/health" -Method GET
```

**Expected:** `{"status":"UP"}`

#### From Your Mobile Device:
**If on same WiFi, test in mobile browser:**
```
http://192.168.1.100:18080/actuator/health
```

**Replace `192.168.1.100` with your computer's IP**

**Expected:** Should show JSON with `{"status":"UP"}`

---

### Step 7: Check Mobile Device and Computer on Same Network

**Both devices must be on the SAME WiFi network!**

**Common issues:**
- Computer on Ethernet, phone on WiFi → ❌ Won't work
- Computer on WiFi A, phone on WiFi B → ❌ Won't work
- Phone on mobile data, computer on WiFi → ❌ Won't work

**Solution:**
- Connect both to the same WiFi network
- Disable mobile data on phone
- Make sure computer's WiFi is not in "Public" mode (use "Private")

---

## 🧪 **TESTING CHECKLIST**

### Device Type Verification:
- [ ] Using Android Emulator (AVD) → Use `10.0.2.2:18080`
- [ ] Using Physical Device → Use computer's IP (e.g., `192.168.1.100:18080`)
- [ ] Using iOS Simulator → Use `localhost:18080`

### Network Verification:
- [ ] Computer and device on same WiFi
- [ ] Firewall allows port 18080
- [ ] Can access `http://YOUR_IP:18080/actuator/health` from mobile browser

### Backend Verification:
- [ ] Backend container running (`docker ps`)
- [ ] Port 18080 exposed (`docker port expense_backend`)
- [ ] No errors in logs (`docker logs expense_backend`)

### Mobile App Verification:
- [ ] API Base URL is correct for device type
- [ ] Mobile app restarted after URL change
- [ ] Cache cleared (`npm start -- --reset-cache`)

---

## 🎯 **QUICK FIXES BY DEVICE TYPE**

### Android Emulator (AVD):
✅ No changes needed
- URL: `http://10.0.2.2:18080` is correct
- Just ensure backend is running

### Physical Android Device:
🔧 **Fix Required:**
1. Get your PC's IP: `ipconfig | findstr IPv4`
2. Update URL in `mobile/src/api/client.ts` line 19
3. Change to: `http://YOUR_IP:18080`
4. Restart mobile app
5. Ensure same WiFi network

### iOS Simulator:
🔧 **Fix Required:**
1. Change URL to `http://localhost:18080`
2. iOS Simulator treats localhost as the host machine

### Physical iOS Device:
🔧 **Fix Required:**
1. Same as physical Android
2. Use computer's IP address
3. Ensure same WiFi network

---

## 🆘 **STILL NOT WORKING?**

### Check Docker Logs:
```powershell
docker logs expense_backend --tail 100 | Select-String "error|exception" -Context 2
```

### Test Backend Directly:
```powershell
# From your computer:
Invoke-WebRequest -Uri "http://localhost:18080/api/v1/bills/search?billNumber=001" -Headers @{"Authorization"="Bearer fake"} -Method GET
```

**Expected:** 401 Unauthorized (means endpoint exists)

### Restart Everything:
```bash
# Restart backend:
docker-compose restart backend

# Restart mobile app:
cd mobile
npm start -- --reset-cache
```

### Enable Debug Logging:
**File:** `mobile/src/config.ts`
```typescript
logging: {
  enableNetworkLogs: true,  // Set to true
}
```

**Look for logs in Metro:**
```
[API] Request: GET /api/v1/bills/search?billNumber=001
[API] Base URL: http://10.0.2.2:18080
```

---

## 📝 **COMMON MISTAKES**

### ❌ Mistake 1: Using 10.0.2.2 on Physical Device
**Symptom:** Network Error
**Fix:** Use computer's actual IP address

### ❌ Mistake 2: Different WiFi Networks
**Symptom:** Network timeout
**Fix:** Connect both to same WiFi

### ❌ Mistake 3: Firewall Blocking Port
**Symptom:** Connection refused
**Fix:** Allow port 18080 in firewall

### ❌ Mistake 4: Backend Not Running
**Symptom:** Connection refused
**Fix:** `docker-compose up -d backend`

### ❌ Mistake 5: Wrong Port
**Symptom:** Connection refused
**Fix:** Backend is on 18080, not 8080

---

## 🎯 **MOST LIKELY FIX FOR YOUR CASE**

Based on "Network Error", you are probably using:

### **Physical Android Device** (Most Common)

**Quick Fix:**
1. Get your computer's IP:
   ```powershell
   ipconfig | findstr IPv4
   ```
   Example output: `192.168.1.100`

2. Edit `d:\Expenses\mobile\src\api\client.ts` line 19:
   ```typescript
   let API_BASE_URL = 'http://192.168.1.100:18080'; // Use YOUR IP
   ```

3. Restart mobile app:
   ```bash
   cd d:\Expenses\mobile
   npm start -- --reset-cache
   ```

4. Test bill search again

---

## ✅ **VERIFICATION**

### After fixing, you should see:
1. ✅ No "Network Error" - Backend responds
2. ✅ Either 200 OK (bill found) or 404 (not found)
3. ✅ No 401 error (auth works)
4. ✅ Bill details auto-fill form

### Logs should show:
```
[API] Request: GET /api/v1/bills/search?billNumber=001
[API] Response: 200 GET /api/v1/bills/search?billNumber=001
```

---

**Created:** Nov 26, 2025, 2:30 PM IST  
**Status:** ⏳ Waiting for device type confirmation  
**Next Step:** Identify if using emulator or physical device, then apply appropriate fix
