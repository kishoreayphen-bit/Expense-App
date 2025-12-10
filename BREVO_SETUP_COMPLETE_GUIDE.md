# 🚨 CRITICAL: Brevo SMTP Setup - Complete Guide

## Current Error:
```
❌ Failed to send invitation email: Authentication failed
```

## Root Cause:
Brevo SMTP authentication is failing. This is usually due to one of these issues:

---

## ✅ **SOLUTION: Follow These Steps Exactly**

### **Step 1: Verify Your Brevo Account**

1. Login to Brevo: https://app.brevo.com
2. Go to: **Settings → SMTP & API**
3. URL: https://app.brevo.com/settings/keys/smtp

---

### **Step 2: Verify Your Sender Email**

**CRITICAL:** Brevo requires you to verify the email address you're sending FROM.

1. Go to: https://app.brevo.com/senders
2. Click **"Add a new sender"**
3. Enter: `kishore.ayphen@gmail.com`
4. Brevo will send a verification email to `kishore.ayphen@gmail.com`
5. **Check your Gmail inbox** for verification email from Brevo
6. Click the verification link
7. Wait for status to show **"Verified"**

**Without this step, emails WILL NOT SEND!**

---

### **Step 3: Get Your SMTP Credentials**

1. Go to: https://app.brevo.com/settings/keys/smtp
2. You should see:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** `kishore.ayphen@gmail.com`
   - **SMTP Key:** Click "Create a new SMTP key"

3. Create a new SMTP key:
   - Click **"Create a new SMTP key"**
   - Name it: `ExpenseApp`
   - Copy the ENTIRE key (it starts with `xsmtpsib-`)

---

### **Step 4: Update Your .env File**

Open: `d:\Expenses\.env`

Update lines 45-47 with your EXACT credentials:

```bash
SMTP_USERNAME=kishore.ayphen@gmail.com
SMTP_PASSWORD=xsmtpsib-YOUR-ACTUAL-KEY-HERE
FROM_EMAIL=kishore.ayphen@gmail.com
```

**IMPORTANT:**
- `SMTP_USERNAME` = Your Brevo login email
- `SMTP_PASSWORD` = Your SMTP key (NOT API key!)
- `FROM_EMAIL` = Must be a VERIFIED sender in Brevo

---

### **Step 5: Restart Backend**

```bash
cd d:\Expenses
docker-compose up -d --force-recreate backend
```

---

### **Step 6: Test Email Sending**

1. Open your app
2. Go to Company Dashboard
3. Click "Invite Member"
4. Enter email: `kishore.muthu@gmail.com`
5. Send invitation

---

### **Step 7: Check Logs**

```bash
docker-compose logs backend -f
```

**Look for:**

✅ **SUCCESS:**
```
================================================================================
📧 SENDING INVITATION EMAIL
To: kishore.muthu@gmail.com
Subject: You're invited to join Ayphen Technologies
...
✅ Email successfully sent to kishore.muthu@gmail.com
```

❌ **FAILURE:**
```
❌ Failed to send invitation email: Authentication failed
```

If you see "Authentication failed":
- Check that sender email is VERIFIED in Brevo
- Check that SMTP key is correct (no extra spaces)
- Check that you're using SMTP key, not API key

---

## 🔍 **Troubleshooting**

### **Issue 1: Authentication Failed**

**Cause:** Wrong credentials or unverified sender

**Solution:**
1. Verify sender email at: https://app.brevo.com/senders
2. Create NEW SMTP key at: https://app.brevo.com/settings/keys/smtp
3. Update `.env` with new key
4. Restart backend: `docker-compose up -d --force-recreate backend`

---

### **Issue 2: Email Not Received**

**Cause:** Email sent successfully but not arriving

**Solution:**
1. Check spam/junk folder
2. Wait 2-3 minutes (SMTP can be delayed)
3. Check Brevo dashboard for sent emails: https://app.brevo.com/campaign/list/email
4. Verify recipient email is correct

---

### **Issue 3: Sender Not Verified**

**Cause:** Trying to send from unverified email

**Solution:**
1. Go to: https://app.brevo.com/senders
2. Add and verify `kishore.ayphen@gmail.com`
3. Check Gmail for verification email
4. Click verification link
5. Wait for "Verified" status

---

## 📋 **Checklist**

Before testing, make sure:

- [ ] Brevo account created
- [ ] Sender email `kishore.ayphen@gmail.com` added to Brevo
- [ ] Sender email VERIFIED (check Gmail for verification link)
- [ ] SMTP key created (not API key!)
- [ ] `.env` file updated with correct credentials
- [ ] Backend restarted with: `docker-compose up -d --force-recreate backend`
- [ ] Logs show no authentication errors

---

## 🎯 **Expected Result**

After completing all steps:

1. Send invitation from app
2. Backend logs show: `✅ Email successfully sent`
3. Email arrives in recipient's inbox within 1-2 minutes
4. Email contains:
   - Professional HTML design
   - Company name: Ayphen Technologies
   - Role information
   - "View Invitation" button
   - Accept/Reject functionality

---

## 📞 **Still Not Working?**

If you've completed ALL steps above and it still doesn't work:

1. **Check Brevo Dashboard:**
   - https://app.brevo.com/campaign/list/email
   - See if emails are being sent

2. **Check Brevo Logs:**
   - https://app.brevo.com/logs
   - See if there are any errors

3. **Verify SMTP Key Type:**
   - Make sure you're using **SMTP key**, not **API key**
   - SMTP keys start with: `xsmtpsib-`
   - API keys start with: `xkeysib-`

4. **Check Sender Verification:**
   - https://app.brevo.com/senders
   - Status must be "Verified" (green checkmark)

5. **Try Different Email:**
   - Send to a different email address
   - Check if it's a recipient issue

---

## 🚀 **Quick Test Command**

After setup, test with:

```bash
# Watch logs in real-time
cd d:\Expenses
docker-compose logs backend -f

# In another terminal, send invitation from app
# You should see email sending logs immediately
```

---

## ✅ **Success Indicators**

You'll know it's working when:

1. Backend logs show: `✅ Email successfully sent`
2. No "Authentication failed" errors
3. Email arrives in inbox (check spam too)
4. Email has proper HTML formatting
5. Links in email work correctly

---

**Complete these steps in order, and your SMTP will work!** 🎉
