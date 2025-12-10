# SMTP Authentication Failed - Troubleshooting Guide

## Current Error:
```
❌ Failed to send invitation email to kishore.ayphen@gmail.com: Authentication failed
```

## Issue:
Brevo SMTP is rejecting the credentials.

## Solution Steps:

### 1. Verify Brevo SMTP Credentials

Go to: https://app.brevo.com/settings/keys/smtp

You should see:
- **SMTP Server:** smtp-relay.brevo.com
- **Port:** 587
- **Login:** Your Brevo account email
- **SMTP Key:** Your generated SMTP key

### 2. Check Your SMTP Key

The SMTP key you provided was:
```
xsmtpsib-YOUR_KEY_HERE-tZ6AX1mMgXD4GIZd
```

**IMPORTANT:** Make sure this is the COMPLETE key with no extra spaces or characters.

### 3. Verify Your Login Email

For Brevo SMTP, the username should be the email you used to sign up for Brevo.

**Current setting:** `kishore.ayphen@gmail.com`

Is this the EXACT email you used to create your Brevo account?

### 4. Alternative: Use API Key Instead

Brevo has TWO types of keys:
1. **SMTP Key** - For SMTP relay (what we're using)
2. **API Key** - For API calls

Make sure you're using the **SMTP Key**, not the API key!

### 5. Check Brevo Dashboard

Login to: https://app.brevo.com

Navigate to: **Settings → SMTP & API**

You should see:
- Your SMTP keys listed
- Status should be "Active"
- You can test the connection there

### 6. Create a New SMTP Key

If the current key doesn't work:

1. Go to: https://app.brevo.com/settings/keys/smtp
2. Click "Create a new SMTP key"
3. Give it a name (e.g., "ExpenseApp")
4. Copy the ENTIRE key
5. Update `.env` file with the new key
6. Recreate backend: `docker-compose up -d --force-recreate backend`

### 7. Verify Sender Email

Check if you need to verify your sender email in Brevo:

1. Go to: https://app.brevo.com/senders
2. Add and verify your sender email
3. The sender email in `.env` should match a verified sender

## Quick Test:

After updating credentials, test with:

```bash
cd d:\Expenses
docker-compose up -d --force-recreate backend
docker-compose logs backend -f
```

Then send an invitation and watch for:
- ✅ "Email successfully sent" - Working!
- ❌ "Authentication failed" - Still wrong credentials
- ❌ "Connection refused" - Network issue

## Most Common Issues:

1. **Wrong SMTP key** - Using API key instead of SMTP key
2. **Incomplete key** - Key was truncated when copying
3. **Wrong email** - Using different email than Brevo account
4. **Unverified sender** - Sender email not verified in Brevo
5. **Spaces in credentials** - Extra spaces when pasting

## Need Help?

Check Brevo's SMTP documentation:
https://developers.brevo.com/docs/send-emails-through-smtp
