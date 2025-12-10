# 🔍 EMULATOR INVITATION DEBUG GUIDE

## 📊 **Current Situation**

- ✅ You're using Android Emulator (correct!)
- ✅ App configured for `http://10.0.2.2:18080` (correct!)
- ✅ Backend running on port 18080
- ✅ SMTP configured with Ethereal
- ❌ NO invitation emails appearing in Ethereal
- ❌ NO invitation requests in backend logs

**This means: The invitation button isn't working!**

---

## 🎯 **Let's Debug Step by Step**

### **Step 1: Open Backend Logs**

**In a terminal, run:**
```bash
cd d:\Expenses
docker-compose logs backend -f
```

**Keep this open!** You'll see logs in real-time.

---

### **Step 2: Try Sending Invitation from Emulator**

1. **Open your app in the emulator**
2. **Make sure you're logged in**
3. **Go to Company Dashboard**
4. **Click "Invite Member"**
5. **Fill in:**
   - Email: `test@example.com`
   - Role: `EMPLOYEE`
6. **Click "Send Invitation"**

---

### **Step 3: Watch What Happens**

#### **Scenario A: You see logs in Terminal**

```
POST /api/v1/companies/1/members/invite
📧 Attempting to send invitation email to: test@example.com
✅ Email successfully sent
```

**✅ SUCCESS!** Go to https://ethereal.email/messages and refresh - email will be there!

---

#### **Scenario B: NO logs appear**

This means the request **isn't reaching the backend**.

**Possible causes:**
1. App can't connect to backend
2. You're not logged in
3. Wrong company ID
4. Network error

**Debug:**
```bash
# Check if emulator can reach backend
# In emulator's browser, go to:
http://10.0.2.2:18080/actuator/health

# Should show: {"status":"UP"}
```

---

#### **Scenario C: Error logs appear**

```
ERROR: Authentication failed
ERROR: User not found
ERROR: Company not found
```

**Tell me the exact error** and I'll help fix it!

---

### **Step 4: Check App Console**

**In your development terminal (where you run `npm start` or `expo start`):**

Look for errors like:
```
[InviteMember] Error inviting member: ...
Network request failed
Timeout
```

**Share any errors you see!**

---

## 🔧 **Common Issues & Fixes**

### **Issue 1: "Success" message but no email**

**If app shows "Invitation sent successfully" but no logs:**

The app might be showing success even though the request failed.

**Check:**
- Backend logs (should show POST request)
- App console (might show hidden errors)

---

### **Issue 2: Network timeout**

**If you see timeout errors:**

```bash
# Test backend connectivity from emulator
# Open emulator browser and go to:
http://10.0.2.2:18080/actuator/health
```

**If this fails:**
- Backend might not be running
- Port might be wrong
- Firewall blocking connection

---

### **Issue 3: 401 Unauthorized**

**If logs show 401 error:**

You're not logged in or token expired.

**Fix:**
1. Logout from app
2. Login again
3. Try sending invitation

---

### **Issue 4: 404 Not Found**

**If logs show 404:**

Wrong endpoint URL.

**Check InviteMemberScreen is calling:**
```
POST /api/v1/companies/{companyId}/members/invite
```

---

## 📝 **What to Do NOW**

### **Action 1: Monitor Logs & Test**

1. **Terminal 1:** `docker-compose logs backend -f`
2. **Emulator:** Send invitation
3. **Watch Terminal 1** for logs
4. **Tell me what you see!**

---

### **Action 2: Check Emulator Network**

**In emulator's Chrome browser, go to:**
```
http://10.0.2.2:18080/actuator/health
```

**Should show:**
```json
{"status":"UP"}
```

**If it doesn't work:**
- Backend isn't accessible from emulator
- Need to fix network configuration

---

### **Action 3: Enable Debug Logging**

**In your app terminal, look for:**
```
[CompanyMemberService] Inviting test@example.com to company 1 as EMPLOYEE
```

**This log appears BEFORE the API call.**

**If you see this but NO backend logs:**
- Request is being made
- But not reaching backend
- Network issue!

---

## 🎯 **Expected Flow**

### **✅ What SHOULD Happen:**

1. **You click "Send Invitation"**
2. **App console shows:**
   ```
   [CompanyMemberService] Inviting test@example.com to company 1 as EMPLOYEE
   ```
3. **Backend logs show:**
   ```
   POST /api/v1/companies/1/members/invite
   📧 Attempting to send invitation email to: test@example.com
   ✅ Email successfully sent to: test@example.com
   ```
4. **App shows:** "Invitation sent to test@example.com"
5. **Ethereal shows:** Email in Messages tab

---

## 🆘 **If Still Not Working**

**Tell me:**

1. **What do you see in backend logs?**
   - Nothing?
   - Errors?
   - Success messages?

2. **What does the app show?**
   - Success message?
   - Error message?
   - Nothing?

3. **Can emulator reach backend?**
   - Test: `http://10.0.2.2:18080/actuator/health` in emulator browser

4. **Any errors in app console?**
   - Share the full error message

---

## ✅ **Quick Checklist**

**Before testing:**
- [ ] Backend is running: `docker-compose ps`
- [ ] Logs terminal open: `docker-compose logs backend -f`
- [ ] Emulator is running
- [ ] App is open and you're logged in
- [ ] You're on Company Dashboard

**During testing:**
- [ ] Click "Invite Member"
- [ ] Fill in email and role
- [ ] Click Send
- [ ] Watch backend logs terminal
- [ ] Check app for success/error message

**After testing:**
- [ ] Check Ethereal: https://ethereal.email/login
- [ ] Username: `dagmar.zieme49@ethereal.email`
- [ ] Password: `MQsz7yuY8RaEdcs2Vg`
- [ ] Look in "Messages" tab

---

## 🎯 **Most Likely Issue**

Since you're using the emulator and configuration looks correct, the most likely issues are:

1. **You haven't actually clicked "Send Invitation" yet** ⚠️
2. **The invitation button has a bug** (frontend issue)
3. **You're not logged in** (auth issue)
4. **Wrong company ID** (navigation issue)

**Let's test NOW and see what happens!** 🚀

---

**Open the logs terminal, send an invitation, and tell me EXACTLY what you see!**
