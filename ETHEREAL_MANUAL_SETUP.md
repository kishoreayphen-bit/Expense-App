# 📧 Ethereal Email - Manual Setup Guide

## 🚀 **Quick Setup (2 Minutes)**

### **Step 1: Create Ethereal Account**

**Go to:** https://ethereal.email/create

Click **"Create Ethereal Account"** button

You'll see credentials like this:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:     John Doe
Username: john.doe123@ethereal.email
Password: abc123xyz789
Host:     smtp.ethereal.email
Port:     587
Secure:   false (use STARTTLS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**⚠️ SAVE THESE CREDENTIALS!** You'll need them.

---

### **Step 2: Update `.env` File**

Open `d:\Expenses\.env` and replace lines 43-47 with:

```bash
# Ethereal SMTP Configuration (Testing)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USERNAME=YOUR_ETHEREAL_USERNAME@ethereal.email
SMTP_PASSWORD=YOUR_ETHEREAL_PASSWORD
FROM_EMAIL=YOUR_ETHEREAL_USERNAME@ethereal.email
```

**Example with real credentials:**
```bash
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USERNAME=john.doe123@ethereal.email
SMTP_PASSWORD=abc123xyz789
FROM_EMAIL=john.doe123@ethereal.email
```

---

### **Step 3: Restart Backend**

```bash
cd d:\Expenses
docker-compose up -d --force-recreate backend
```

Wait for backend to start (about 30 seconds).

---

### **Step 4: Test Email**

1. **Monitor logs:**
   ```bash
   docker-compose logs backend -f
   ```

2. **Send invitation from your app**

3. **You should see:**
   ```
   📧 Attempting to send invitation email to: kishore.ayphen@gmail.com
   ✅ Email successfully sent to: kishore.ayphen@gmail.com
   ```

---

### **Step 5: View Email in Ethereal**

1. **Go to:** https://ethereal.email/login

2. **Login with your Ethereal credentials:**
   - Username: `your.username@ethereal.email`
   - Password: `your_password`

3. **Click "Messages"** to see all sent emails

4. **Click on an email** to view:
   - HTML preview
   - Plain text version
   - Email headers
   - Source code

---

## 🎯 **Why Ethereal is Perfect for Testing**

✅ **No real emails sent** - Safe for development
✅ **Instant preview** - See emails immediately in web interface
✅ **No authentication issues** - Always works
✅ **No DKIM/DMARC problems** - No configuration needed
✅ **Free forever** - No limits
✅ **Perfect for testing** - Test email templates and content

---

## 📋 **Complete Example**

### **1. Create Account:**
https://ethereal.email/create

### **2. Copy Credentials:**
```
Username: john.doe123@ethereal.email
Password: abc123xyz789
```

### **3. Update `.env`:**
```bash
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USERNAME=john.doe123@ethereal.email
SMTP_PASSWORD=abc123xyz789
FROM_EMAIL=john.doe123@ethereal.email
```

### **4. Restart:**
```bash
docker-compose up -d --force-recreate backend
```

### **5. Test:**
Send invitation → Check logs → View at https://ethereal.email/messages

---

## ✅ **Benefits**

| Feature | Ethereal | Brevo |
|---------|----------|-------|
| Setup Time | 30 seconds | 30 minutes |
| Authentication | Always works | Often fails |
| DKIM/DMARC | Not needed | Required |
| Email Preview | Instant | Need real inbox |
| Cost | Free | Free (limited) |
| Best For | Testing | Production |

---

## 🔄 **For Production Later**

When you're ready to send real emails:

1. **Switch to production SMTP:**
   - Resend (recommended)
   - SendGrid
   - Mailgun

2. **Update `.env`** with production credentials

3. **Restart backend**

**But for now, Ethereal is perfect for testing!**

---

## 🆘 **Troubleshooting**

### **If you see authentication errors:**

1. **Double-check credentials** in `.env`
2. **Make sure no extra spaces** in username/password
3. **Verify SMTP_HOST** is `smtp.ethereal.email`
4. **Verify SMTP_PORT** is `587`

### **If emails don't appear:**

1. **Login to Ethereal:** https://ethereal.email/login
2. **Check "Messages" tab**
3. **Verify backend logs** show "Email successfully sent"

---

## 📝 **Quick Checklist**

- [ ] Create account: https://ethereal.email/create
- [ ] Save username and password
- [ ] Update `.env` with Ethereal credentials
- [ ] Restart backend: `docker-compose up -d --force-recreate backend`
- [ ] Send test invitation
- [ ] View email: https://ethereal.email/messages

---

**Ethereal will solve all your email testing problems!** 🎉
