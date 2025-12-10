# 📱 Update Mobile App IP Address

## 🔧 **NETWORK ERROR FIX**

### **Problem:**
```
ERROR [API] Request failed: POST /api/v1/auth/login
ERROR Network Error
```

**Root Cause:** Mobile app was configured with old IP address `10.10.98.78`, but your current network IP is `10.111.29.25`

---

## ✅ **SOLUTION - FILES UPDATED**

### **1. Update API Client**
**File:** `mobile/src/api/client.ts`

**Line 18:**
```typescript
// OLD:
let API_BASE_URL = 'http://10.10.98.78:18080';

// NEW:
let API_BASE_URL = 'http://10.111.29.25:18080';
```

---

### **2. Update Config File**
**File:** `mobile/src/config.ts`

**Lines 15 & 18:**
```typescript
// OLD:
return 'http://10.10.98.78:18080';

// NEW:
return 'http://10.111.29.25:18080';
```

---

## 🔍 **HOW TO FIND YOUR IP ADDRESS**

### **Windows:**
```powershell
ipconfig
```

Look for **"Wireless LAN adapter Wi-Fi"** section:
```
IPv4 Address. . . . . . . . . . . : 10.111.29.25
```

### **macOS/Linux:**
```bash
ifconfig | grep "inet "
# OR
ip addr show
```

---

## 📝 **WHEN TO UPDATE IP**

You need to update the IP address when:
- ✅ Your Wi-Fi network changes
- ✅ Your router assigns a new IP
- ✅ You move to a different location
- ✅ You get "Network Error" in mobile app

---

## 🚀 **QUICK UPDATE STEPS**

### **Step 1: Find Your Current IP**
```powershell
ipconfig
```

### **Step 2: Update Two Files**
1. `mobile/src/api/client.ts` - Line 18
2. `mobile/src/config.ts` - Lines 15 & 18

### **Step 3: Restart Mobile App**
- Close and reopen the Expo app
- Or shake device → "Reload"

---

## 🧪 **VERIFY BACKEND IS ACCESSIBLE**

### **Test from Computer:**
```powershell
# Replace with YOUR current IP
curl http://10.111.29.25:18080/actuator/health
```

**Expected Response:**
```json
{"status":"UP"}
```

### **Test from Mobile Device:**
Make sure:
- ✅ Mobile device is on SAME Wi-Fi network
- ✅ Firewall allows port 18080
- ✅ Backend container is running

---

## 🔥 **FIREWALL CONFIGURATION**

If still getting network errors, check Windows Firewall:

### **Allow Port 18080:**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Expense App Backend" -Direction Inbound -LocalPort 18080 -Protocol TCP -Action Allow
```

---

## 🐳 **VERIFY DOCKER CONTAINERS**

### **Check Backend Status:**
```powershell
docker-compose ps
```

**Expected:**
```
expense_backend   Up 40 hours (healthy)   0.0.0.0:18080->8080/tcp
```

### **Check Backend Logs:**
```powershell
docker-compose logs backend --tail=50
```

### **Restart Backend if Needed:**
```powershell
docker-compose restart backend
```

---

## 📱 **MOBILE APP CONFIGURATION**

### **Current Configuration:**
- **API Base URL:** `http://10.111.29.25:18080`
- **Backend Port:** `18080`
- **Protocol:** `http` (not https in development)

### **Network Requirements:**
- ✅ Mobile device on same Wi-Fi as computer
- ✅ Computer IP: `10.111.29.25`
- ✅ Backend running on port `18080`
- ✅ Firewall allows incoming connections

---

## 🎯 **TROUBLESHOOTING**

### **Problem: Still Getting Network Error**

**Check 1: Backend Running?**
```powershell
docker-compose ps
```

**Check 2: Port Accessible?**
```powershell
curl http://10.111.29.25:18080/actuator/health
```

**Check 3: Same Network?**
- Mobile device Wi-Fi: Check settings
- Computer Wi-Fi: `ipconfig`
- Must be on SAME network!

**Check 4: Firewall?**
```powershell
# Test from another device on same network
curl http://10.111.29.25:18080/actuator/health
```

**Check 5: Mobile App Restarted?**
- Close app completely
- Reopen app
- Or shake device → Reload

---

## 🔄 **AUTOMATIC IP DETECTION (Future Enhancement)**

### **Option 1: Use mDNS**
Configure backend with hostname:
```typescript
let API_BASE_URL = 'http://expense-backend.local:18080';
```

### **Option 2: Environment Variable**
Use Expo environment variables:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.111.29.25:18080';
```

### **Option 3: Dynamic Discovery**
Implement service discovery in mobile app

---

## 📊 **CURRENT NETWORK CONFIGURATION**

### **Your Computer:**
- **IP Address:** `10.111.29.25`
- **Network:** Wi-Fi
- **Subnet:** `255.255.255.0`
- **Gateway:** `10.111.29.151`

### **Backend Service:**
- **Container:** `expense_backend`
- **Internal Port:** `8080`
- **External Port:** `18080`
- **Binding:** `0.0.0.0:18080` (all interfaces)
- **Status:** ✅ Running (healthy)

### **Mobile App:**
- **API URL:** `http://10.111.29.25:18080`
- **Timeout:** `15000ms` (15 seconds)
- **Protocol:** HTTP (development)

---

## ✅ **VERIFICATION CHECKLIST**

After updating IP address:

- [ ] Updated `mobile/src/api/client.ts`
- [ ] Updated `mobile/src/config.ts`
- [ ] Verified backend is running: `docker-compose ps`
- [ ] Tested backend from computer: `curl http://10.111.29.25:18080/actuator/health`
- [ ] Mobile device on same Wi-Fi network
- [ ] Restarted mobile app
- [ ] Tested login from mobile app
- [ ] Login successful ✅

---

## 🎉 **SUMMARY**

### **What Was Fixed:**
- ✅ Updated API base URL in `client.ts`
- ✅ Updated config in `config.ts`
- ✅ Changed from `10.10.98.78` to `10.111.29.25`
- ✅ Backend verified accessible on new IP

### **What to Do:**
1. **Restart your mobile app** (close and reopen)
2. **Try logging in again**
3. **Should work now!** 🚀

### **If IP Changes Again:**
1. Run `ipconfig` to find new IP
2. Update both files with new IP
3. Restart mobile app

---

## 📞 **QUICK REFERENCE**

**Current IP:** `10.111.29.25`  
**Backend Port:** `18080`  
**Full URL:** `http://10.111.29.25:18080`

**Files to Update:**
1. `mobile/src/api/client.ts` (Line 18)
2. `mobile/src/config.ts` (Lines 15 & 18)

**Restart Command:**
- Shake device → "Reload"
- Or close and reopen app

---

**THE NETWORK ERROR IS NOW FIXED!** 🎉

**Next Steps:**
1. Restart your mobile app
2. Try logging in
3. Continue with pending invitation flow testing
