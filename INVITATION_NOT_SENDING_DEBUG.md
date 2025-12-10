# 🔍 INVITATION NOT SENDING - DEBUG GUIDE

## 📊 **Current Status**

```
✅ Backend is running
✅ SMTP is configured correctly
✅ Ethereal account is active
❌ NO invitation emails in Ethereal
❌ NO invitation POST requests in backend logs
```

**This means: The invitation request is NOT reaching the backend!**

---

## 🎯 **Root Cause**

The problem is **NOT with SMTP** - it's that the invitation button/form in your app is either:
1. Not sending the request to the backend
2. Sending to the wrong endpoint
3. Failing silently in the frontend

---

## 🔍 **Let's Debug Step by Step**

### **Step 1: Verify Backend Endpoint Exists**

```bash
cd d:\Expenses
docker-compose logs backend --tail=1000 | Select-String "POST.*companies.*members"
```

This should show if the endpoint is registered.

---

### **Step 2: Test Backend Endpoint Directly**

Let's send a test invitation using curl to verify the backend works:

```bash
# First, get your auth token (login)
curl -X POST http://localhost:8080/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@demo.local\",\"password\":\"admin123\"}'
```

**Copy the token from the response**, then:

```bash
# Send invitation (replace YOUR_TOKEN and adjust company ID if needed)
curl -X POST http://localhost:8080/api/v1/companies/1/members/invite `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{\"email\":\"test@example.com\",\"role\":\"EMPLOYEE\"}'
```

**Watch the backend logs while running this!**

---

### **Step 3: Check InviteMemberScreen**

Let me check your InviteMemberScreen to see if there's an issue:

```typescript
// The screen should be making a POST request like:
POST /api/v1/companies/{companyId}/members/invite
{
  "email": "test@example.com",
  "role": "EMPLOYEE"
}
```

---

## 🔧 **Common Issues**

### **Issue 1: Wrong API Endpoint in Frontend**

**Check your mobile app's API configuration:**

File: `mobile/src/config/api.ts` or similar

Should have:
```typescript
export const API_BASE_URL = 'http://YOUR_IP:8080';
// NOT http://localhost:3000
```

---

### **Issue 2: Network Error (Mobile Can't Reach Backend)**

**If testing on physical device:**
- Backend must be accessible at your computer's IP
- Use `http://192.168.x.x:8080` (your local IP)
- NOT `http://localhost:8080`

**Find your IP:**
```bash
ipconfig
# Look for IPv4 Address under your active network
```

---

### **Issue 3: CORS Error**

**Check browser console (if using web):**
- Open Developer Tools (F12)
- Check Console tab for errors
- Look for CORS or network errors

---

### **Issue 4: Frontend Error Not Shown**

**The invitation might be failing silently in the frontend.**

Check the InviteMemberScreen for error handling.

---

## 📝 **What You Should Do NOW**

### **Option A: Test with curl (Recommended)**

This will prove if the backend works:

1. **Get auth token:**
   ```bash
   curl -X POST http://localhost:8080/api/v1/auth/login `
     -H "Content-Type: application/json" `
     -d '{\"email\":\"admin@demo.local\",\"password\":\"admin123\"}'
   ```

2. **Copy the token from response**

3. **Send invitation:**
   ```bash
   curl -X POST http://localhost:8080/api/v1/companies/1/members/invite `
     -H "Content-Type: application/json" `
     -H "Authorization: Bearer YOUR_TOKEN_HERE" `
     -d '{\"email\":\"test@example.com\",\"role\":\"EMPLOYEE\"}'
   ```

4. **Watch backend logs:**
   ```bash
   docker-compose logs backend -f
   ```

**If this works, the problem is in your frontend!**

---

### **Option B: Check Frontend Code**

Let me look at your InviteMemberScreen:

```bash
# Show me the file
cat mobile/src/screens/InviteMemberScreen.tsx
```

I'll check:
- API endpoint URL
- Request format
- Error handling
- Network configuration

---

### **Option C: Enable Frontend Debugging**

**If using Expo:**
```bash
# In your mobile terminal
# Press 'd' to open developer menu
# Enable "Remote JS Debugging"
# Check browser console for errors
```

---

## 🎯 **Expected Behavior**

### **When invitation is sent:**

1. **Frontend:** Makes POST request to `/api/v1/companies/{id}/members/invite`
2. **Backend logs show:**
   ```
   POST /api/v1/companies/1/members/invite
   📧 Attempting to send invitation email to: test@example.com
   ✅ Email successfully sent
   ```
3. **Ethereal:** Email appears in Messages tab
4. **Frontend:** Shows success message

---

## 🆘 **Next Steps**

**Please do ONE of these:**

### **1. Test with curl (5 minutes)**
Run the curl commands above and tell me the result.

### **2. Show me InviteMemberScreen**
```bash
cat d:\Expenses\mobile\src\screens\InviteMemberScreen.tsx
```
I'll check if there's a frontend issue.

### **3. Check mobile app console**
- Enable debugging in your mobile app
- Try sending invitation
- Check for errors in console
- Share any error messages

---

## 📊 **Summary**

**Problem:** Invitation emails not appearing in Ethereal

**Root Cause:** Invitation request NOT reaching backend

**Evidence:**
- ✅ Backend logs show NO POST to invite endpoint
- ✅ SMTP config is correct
- ✅ Backend is running
- ❌ No invitation attempts logged

**Solution:** Need to debug frontend → backend communication

---

**Let's test with curl first to isolate if it's a frontend or backend issue!** 🔍
