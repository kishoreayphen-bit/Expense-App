# 🔍 SMTP Final Debugging Guide

## Current Status:
- ✅ Sender email verified in Brevo: `kishore.ayphen@gmail.com`
- ✅ SMTP credentials loaded in backend
- ✅ Backend running with SMTP debug enabled
- ❌ Emails still not being received

---

## 🧪 Test Steps:

### 1. Send an Invitation from the App

1. Open your Expense App
2. Go to **Company Dashboard**
3. Click **"Invite Member"**
4. Enter email: `kishore.muthu@gmail.com`
5. Click **Send**

### 2. Watch Backend Logs in Real-Time

Open a terminal and run:
```bash
cd d:\Expenses
docker-compose logs backend -f
```

### 3. What to Look For:

**✅ SUCCESS - You should see:**
```
================================================================================
📧 SENDING INVITATION EMAIL
To: kishore.muthu@gmail.com
Subject: You're invited to join Ayphen Technologies
Company: Ayphen Technologies
Role: EMPLOYEE
Invited by: admin@demo.local
================================================================================
DEBUG SMTP: Connecting to smtp-relay.brevo.com:587
DEBUG SMTP: Connected
DEBUG SMTP: STARTTLS
DEBUG SMTP: AUTH LOGIN
DEBUG SMTP: 235 Authentication successful
DEBUG SMTP: MAIL FROM:<kishore.ayphen@gmail.com>
DEBUG SMTP: 250 OK
DEBUG SMTP: RCPT TO:<kishore.muthu@gmail.com>
DEBUG SMTP: 250 OK
DEBUG SMTP: DATA
DEBUG SMTP: 354 Start mail input
DEBUG SMTP: 250 OK id=...
✅ Email successfully sent to kishore.muthu@gmail.com
```

**❌ FAILURE - If you see:**
```
❌ Failed to send invitation email to kishore.muthu@gmail.com: Authentication failed
```
OR
```
❌ Failed to send invitation email to kishore.muthu@gmail.com: Connection refused
```
OR
```
❌ Failed to send invitation email to kishore.muthu@gmail.com: 535 Authentication failed
```

---

## 🚨 Common Issues & Solutions:

### Issue 1: No Logs Appear

**Symptom:** Nothing appears in logs when you click "Send"

**Cause:** Invitation API call is failing before reaching email service

**Solution:**
1. Check if invitation was created in database
2. Check frontend network tab for errors
3. Verify JWT token is valid

### Issue 2: "Authentication failed"

**Symptom:** `535 Authentication failed` or `Authentication failed`

**Possible Causes:**
1. SMTP key is incorrect
2. Sender email not verified
3. Using API key instead of SMTP key

**Solution:**
1. Go to: https://app.brevo.com/settings/keys/smtp
2. Create a **NEW** SMTP key
3. Copy the ENTIRE key
4. Update `.env` file:
   ```bash
   SMTP_PASSWORD=xsmtpsib-YOUR-NEW-KEY-HERE
   ```
5. Recreate backend:
   ```bash
   docker-compose up -d --force-recreate backend
   ```

### Issue 3: "Connection refused" or "Connection timeout"

**Symptom:** Cannot connect to SMTP server

**Possible Causes:**
1. Firewall blocking port 587
2. Network issue
3. Wrong SMTP host

**Solution:**
1. Test connection manually:
   ```bash
   telnet smtp-relay.brevo.com 587
   ```
2. If that fails, try port 2525:
   ```bash
   SMTP_PORT=2525
   ```
3. Check firewall settings

### Issue 4: Email Sent Successfully But Not Received

**Symptom:** Logs show `✅ Email successfully sent` but email doesn't arrive

**Possible Causes:**
1. Email in spam folder
2. Brevo account has sending limits
3. Recipient email blocking

**Solution:**
1. **Check spam/junk folder** - This is most common!
2. Check Brevo dashboard: https://app.brevo.com/campaign/list/email
3. Check Brevo logs: https://app.brevo.com/logs
4. Try sending to a different email address
5. Wait 5-10 minutes (sometimes delayed)

---

## 🔧 Advanced Debugging:

### Enable Maximum SMTP Debug Logging

The backend already has `spring.mail.properties.mail.debug=true` enabled.

This will show EVERY SMTP command in the logs.

### Check Brevo Account Status

1. Login to: https://app.brevo.com
2. Check if account is active
3. Check sending limits (free tier: 300 emails/day)
4. Check if any emails are in "Blocked" status

### Verify FROM_EMAIL

The backend is configured to send from: `kishore.ayphen@gmail.com`

This MUST be:
- ✅ Verified in Brevo senders
- ✅ Match the SMTP_USERNAME
- ✅ Not blocked or blacklisted

### Test with Different Email

Try sending to:
- Your own email: `kishore.ayphen@gmail.com`
- A different Gmail: `kishore.muthu@gmail.com`
- A different provider: Yahoo, Outlook, etc.

---

## 📋 Pre-Flight Checklist:

Before testing, verify:

- [ ] Brevo account is active
- [ ] Sender email `kishore.ayphen@gmail.com` shows "Verified" in Brevo
- [ ] SMTP key is correct (starts with `xsmtpsib-`)
- [ ] `.env` file has correct credentials
- [ ] Backend was recreated after `.env` changes
- [ ] Backend is running: `docker-compose ps`
- [ ] No firewall blocking port 587
- [ ] Watching logs: `docker-compose logs backend -f`

---

## 🎯 Step-by-Step Test Procedure:

1. **Start log monitoring:**
   ```bash
   cd d:\Expenses
   docker-compose logs backend -f
   ```

2. **Open app and send invitation**

3. **Observe logs immediately**
   - Should see "📧 SENDING INVITATION EMAIL" within 1-2 seconds
   - Should see SMTP debug output
   - Should see either ✅ success or ❌ error

4. **If successful:**
   - Wait 2-3 minutes
   - Check recipient inbox
   - Check spam folder
   - Check Brevo dashboard

5. **If failed:**
   - Note the exact error message
   - Follow troubleshooting steps above
   - Try creating new SMTP key

---

## 🆘 If Still Not Working:

1. **Create a brand new SMTP key:**
   - https://app.brevo.com/settings/keys/smtp
   - Delete old key
   - Create new key with name "ExpenseApp2"
   - Copy ENTIRE key
   - Update `.env`
   - Recreate backend

2. **Try alternative SMTP port:**
   ```bash
   SMTP_PORT=2525
   ```

3. **Verify Brevo account limits:**
   - Check if you've hit daily limit (300 emails)
   - Check if account is suspended

4. **Test with Brevo's test tool:**
   - Go to Brevo dashboard
   - Use their built-in email tester
   - If that works, issue is in our code
   - If that fails, issue is with Brevo account

---

## ✅ Success Indicators:

You'll know it's working when:

1. Logs show: `✅ Email successfully sent to kishore.muthu@gmail.com`
2. No authentication errors
3. Email arrives in inbox within 1-5 minutes
4. Email has proper HTML formatting
5. Links work correctly

---

**Follow these steps carefully and report back what you see in the logs!** 🚀
