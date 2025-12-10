# 🔑 GET YOUR STRIPE KEYS NOW!

## ⚠️ **ISSUE FOUND**

### **Error:**
```
Invalid API Key provided: sk_test_****************here
```

### **Problem:**
Your `.env` file still has placeholder Stripe keys. You need to replace them with **real Stripe test keys**.

---

## 🚀 **QUICK FIX (5 MINUTES)**

### **Step 1: Get Stripe Keys (2 minutes)**

1. **Go to Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/test/apikeys
   ```

2. **Sign up** if you don't have an account (it's free!)

3. **Copy your keys:**
   - **Secret key** (starts with `sk_test_`)
   - **Publishable key** (starts with `pk_test_`)

---

### **Step 2: Update .env File (1 minute)**

Open `d:\Expenses\.env` and replace lines 52-53:

**BEFORE:**
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**AFTER:**
```bash
STRIPE_SECRET_KEY=sk_test_51ABC...YOUR_ACTUAL_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...YOUR_ACTUAL_KEY_HERE
```

**⚠️ IMPORTANT:** 
- Copy the FULL key (they're very long!)
- Don't add quotes or spaces
- Keep the key on one line

---

### **Step 3: Restart Backend (1 minute)**

```powershell
cd d:\Expenses
docker-compose restart backend
```

Wait 10 seconds for backend to restart.

---

### **Step 4: Test Payment (1 minute)**

1. Open mobile app
2. Go to Splits → Auto Split
3. Click **"Pay Now"**
4. **Payment screen should open!** ✨

---

## 📋 **DETAILED STEPS**

### **Getting Stripe Keys:**

1. **Visit:** https://stripe.com/
2. **Click:** "Sign in" (or "Sign up" if new)
3. **After login, go to:** https://dashboard.stripe.com/test/apikeys
4. **You'll see:**
   ```
   Publishable key: pk_test_51...
   Secret key: sk_test_51... (click "Reveal test key")
   ```
5. **Click "Reveal test key"** to see the secret key
6. **Copy both keys**

---

### **Updating .env File:**

**Option 1: Using VS Code/IDE**
1. Open `d:\Expenses\.env`
2. Find lines 52-53
3. Replace placeholder with your keys
4. Save file (Ctrl+S)

**Option 2: Using Notepad**
1. Open Notepad
2. File → Open → `d:\Expenses\.env`
3. Find and replace the keys
4. File → Save

---

### **Example .env (with fake keys):**

```bash
# Stripe Payment Configuration
# Get your keys from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_51QR8xYZ1234567890abcdefghijklmnopqrstuvwxyz
STRIPE_PUBLISHABLE_KEY=pk_test_51QR8xYZ1234567890abcdefghijklmnopqrstuvwxyz
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Note:** Your actual keys will be much longer!

---

## ✅ **VERIFICATION**

### **After Updating Keys:**

1. **Restart backend:**
   ```powershell
   docker-compose restart backend
   ```

2. **Check logs:**
   ```powershell
   docker-compose logs backend --tail=20
   ```

3. **Look for:**
   ```
   Started BackendApplication in X seconds
   ```

4. **Test payment:**
   - Open mobile app
   - Click Pay Now
   - Should work now! ✨

---

## 🆘 **TROUBLESHOOTING**

### **"I don't have a Stripe account"**
- Sign up at https://stripe.com/ (free!)
- No credit card required for test mode
- Takes 2 minutes

### **"I can't find my keys"**
- Go to: https://dashboard.stripe.com/test/apikeys
- Make sure you're in **TEST mode** (toggle in top right)
- Click "Reveal test key" for secret key

### **"Keys are too long to copy"**
- They're supposed to be long (60+ characters)
- Copy the entire key
- Don't break it into multiple lines

### **"Still getting 400 error"**
- Make sure you copied the FULL key
- Check for extra spaces or quotes
- Restart backend after updating
- Wait 10 seconds after restart

---

## 📝 **WHAT EACH KEY DOES**

### **Secret Key (sk_test_...):**
- Used by backend
- Keeps your account secure
- Never share publicly
- Never commit to Git

### **Publishable Key (pk_test_...):**
- Used by frontend
- Safe to expose publicly
- Identifies your Stripe account

### **Webhook Secret (whsec_...):**
- Optional for now
- Used for webhook verification
- Can set up later

---

## 🎯 **QUICK CHECKLIST**

- [ ] Go to https://dashboard.stripe.com/test/apikeys
- [ ] Copy Secret key (sk_test_...)
- [ ] Copy Publishable key (pk_test_...)
- [ ] Open d:\Expenses\.env
- [ ] Replace line 52 with your secret key
- [ ] Replace line 53 with your publishable key
- [ ] Save file
- [ ] Run: `docker-compose restart backend`
- [ ] Wait 10 seconds
- [ ] Test payment in mobile app
- [ ] Success! 🎉

---

## 💡 **WHY THIS IS NEEDED**

The payment system needs valid Stripe API keys to:
- Create payment intents
- Process payments
- Handle webhooks
- Track transactions

Without valid keys, Stripe rejects all requests with:
```
Invalid API Key provided
```

---

## 🔒 **SECURITY NOTES**

### **DO:**
- ✅ Use test keys (sk_test_, pk_test_)
- ✅ Keep secret key in .env file
- ✅ Add .env to .gitignore
- ✅ Never commit keys to Git

### **DON'T:**
- ❌ Share secret keys publicly
- ❌ Use live keys for testing
- ❌ Commit .env to version control
- ❌ Hardcode keys in code

---

## 🎉 **AFTER YOU UPDATE**

Once you update the keys and restart:

1. **Payment screen will load** ✨
2. **You can test with card:** 4242 4242 4242 4242
3. **Payment will process** through Stripe
4. **Success screen will show** 🎉

---

**Get your Stripe keys now and update the .env file!**

**It only takes 5 minutes and then payments will work!** 🚀

---

## 📞 **NEED HELP?**

If you're stuck:
1. Make sure you're logged into Stripe
2. Make sure you're in TEST mode
3. Copy the ENTIRE key (it's very long)
4. Paste it on ONE line in .env
5. Save and restart backend

**That's it! You're almost there!** 💪
