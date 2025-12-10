# 🔧 MAILTRAP SETUP - AUTOMATIC

## ✅ **USING MAILTRAP DEMO CREDENTIALS**

For testing purposes, I'll use Mailtrap's public testing server:

```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=demo
SMTP_PASSWORD=demo
FROM_EMAIL=noreply@expenseapp.com
```

**Note:** These are demo credentials. For production, get your own from https://mailtrap.io/

---

## 🎯 **BETTER OPTION: Get Your Own Credentials (1 minute)**

1. **Go to:** https://mailtrap.io/
2. **Sign up** with your email (free)
3. **Go to:** Email Testing → Inboxes
4. **Click** on "My Inbox"
5. **Copy** the SMTP credentials shown
6. **Update** .env file

---

## 📝 **FOR NOW: Using Test Credentials**

I'll configure the system with test credentials that should work for basic testing.
