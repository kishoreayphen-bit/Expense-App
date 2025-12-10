# ⚠️ STRIPE KEYS REQUIRED - PAYMENT WON'T WORK WITHOUT THEM

## 🔴 **CURRENT STATUS**

### **Error:**
```
ERROR Stripe error creating payment intent: Invalid API Key provided: sk_test_****************here
```

### **Problem:**
Your `.env` file still contains **placeholder Stripe keys**. The backend cannot process payments without **real Stripe API keys**.

---

## 🚀 **TWO WAYS TO FIX THIS**

### **Option 1: Use PowerShell Script (EASIEST)**

1. **Get your Stripe keys:**
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Sign up if needed (free, no credit card)
   - Copy your Secret key (sk_test_...)
   - Copy your Publishable key (pk_test_...)

2. **Run the script:**
   ```powershell
   cd d:\Expenses
   .\UPDATE_STRIPE_KEYS.ps1
   ```

3. **Follow the prompts:**
   - Paste your Secret key
   - Paste your Publishable key
   - Script will update .env and restart backend

4. **Done!** Test payment in mobile app

---

### **Option 2: Manual Update**

#### **Step 1: Get Stripe Keys**

1. Visit: **https://dashboard.stripe.com/test/apikeys**
2. Sign up/login (free account)
3. Make sure you're in **TEST mode** (toggle in top right)
4. Copy both keys:
   - **Secret key:** Click "Reveal test key" → Copy `sk_test_...`
   - **Publishable key:** Copy `pk_test_...`

#### **Step 2: Update .env File**

Open `d:\Expenses\.env` in any text editor and find these lines:

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

Replace with your actual keys:

```bash
STRIPE_SECRET_KEY=sk_test_51QR8xYZ...YOUR_ACTUAL_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_51QR8xYZ...YOUR_ACTUAL_PUBLISHABLE_KEY
```

**⚠️ IMPORTANT:**
- Copy the ENTIRE key (60+ characters)
- No quotes, no spaces
- Each key on one line
- Save the file

#### **Step 3: Restart Backend**

```powershell
cd d:\Expenses
docker-compose restart backend
```

Wait 15 seconds for backend to restart.

#### **Step 4: Test**

1. Open mobile app
2. Go to Splits → Auto Split
3. Click "Pay Now"
4. Payment screen should open! ✨

---

## 📋 **VISUAL GUIDE**

### **What Your .env Should Look Like:**

**BEFORE (Won't Work):**
```bash
# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**AFTER (Will Work):**
```bash
# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_51QR8xYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF
STRIPE_PUBLISHABLE_KEY=pk_test_51QR8xYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF
```

---

## 🔍 **HOW TO GET STRIPE KEYS**

### **Step-by-Step with Screenshots:**

1. **Go to Stripe:**
   ```
   https://stripe.com/
   ```

2. **Sign Up (if new):**
   - Click "Sign up"
   - Enter email and password
   - No credit card required!
   - Takes 2 minutes

3. **Go to API Keys:**
   ```
   https://dashboard.stripe.com/test/apikeys
   ```

4. **Make Sure You're in TEST Mode:**
   - Look at top right corner
   - Should say "Test mode"
   - If not, toggle the switch

5. **Copy Keys:**
   - **Publishable key:** Already visible, just copy
   - **Secret key:** Click "Reveal test key" button, then copy

6. **Keys Look Like This:**
   ```
   Secret key:      sk_test_51QR8xYZ1234567890...
   Publishable key: pk_test_51QR8xYZ1234567890...
   ```

---

## ✅ **VERIFICATION**

### **After Updating Keys:**

1. **Check .env file:**
   ```powershell
   cat d:\Expenses\.env | Select-String "STRIPE"
   ```
   Should show your actual keys (not placeholders)

2. **Restart backend:**
   ```powershell
   docker-compose restart backend
   ```

3. **Check logs:**
   ```powershell
   docker-compose logs backend --tail=20
   ```
   Should see: "Started BackendApplication"

4. **Test payment:**
   - Open mobile app
   - Click Pay Now
   - Should work! ✨

---

## 🆘 **TROUBLESHOOTING**

### **"I don't have a Stripe account"**

**Solution:**
1. Go to https://stripe.com/
2. Click "Sign up"
3. Enter email and password
4. Verify email
5. Done! (No credit card needed)

---

### **"I can't find my keys"**

**Solution:**
1. Make sure you're logged in to Stripe
2. Go to: https://dashboard.stripe.com/test/apikeys
3. Check top right - should say "Test mode"
4. If not, toggle the switch
5. Keys are on this page

---

### **"Keys are too long"**

**Solution:**
- They're supposed to be long (60+ characters)
- Copy the ENTIRE key
- Don't break it into multiple lines
- Paste it all on one line in .env

---

### **"Still getting 400 error after updating"**

**Solution:**
1. Make sure you saved the .env file
2. Restart backend: `docker-compose restart backend`
3. Wait 15 seconds
4. Try again
5. Check logs: `docker-compose logs backend --tail=50`

---

### **"Backend won't restart"**

**Solution:**
```powershell
# Stop everything
docker-compose down

# Start again
docker-compose up -d

# Wait 30 seconds
Start-Sleep -Seconds 30

# Check status
docker-compose ps
```

---

## 💡 **WHY THIS IS NEEDED**

### **What Stripe Keys Do:**

**Secret Key (sk_test_...):**
- Used by backend to create payments
- Authenticates with Stripe servers
- Processes payment intents
- **Must be kept secret!**

**Publishable Key (pk_test_...):**
- Used by frontend
- Safe to expose publicly
- Identifies your Stripe account

### **Without Valid Keys:**
- ❌ Backend can't talk to Stripe
- ❌ Payment intents fail
- ❌ You get 400 errors
- ❌ Payments don't work

### **With Valid Keys:**
- ✅ Backend connects to Stripe
- ✅ Payment intents created
- ✅ Payments processed
- ✅ Everything works!

---

## 🔒 **SECURITY NOTES**

### **DO:**
- ✅ Use TEST keys (sk_test_, pk_test_)
- ✅ Keep secret key in .env file
- ✅ Add .env to .gitignore (already done)
- ✅ Never share secret keys

### **DON'T:**
- ❌ Commit keys to Git
- ❌ Share secret keys publicly
- ❌ Use live keys for testing
- ❌ Hardcode keys in code

---

## 📝 **QUICK CHECKLIST**

- [ ] Go to https://dashboard.stripe.com/test/apikeys
- [ ] Sign up/login to Stripe
- [ ] Switch to TEST mode
- [ ] Copy Secret key (sk_test_...)
- [ ] Copy Publishable key (pk_test_...)
- [ ] Open d:\Expenses\.env
- [ ] Replace line 52 with your secret key
- [ ] Replace line 53 with your publishable key
- [ ] Save file
- [ ] Run: `docker-compose restart backend`
- [ ] Wait 15 seconds
- [ ] Test payment in mobile app
- [ ] Success! 🎉

---

## 🎯 **WHAT HAPPENS AFTER**

Once you update the keys and restart:

1. **Backend connects to Stripe** ✅
2. **Payment intents created** ✅
3. **Payment screen loads** ✅
4. **You can test payments** ✅
5. **Use test card:** 4242 4242 4242 4242
6. **Payment succeeds** ✅
7. **Success screen shows** 🎉

---

## 📞 **STILL STUCK?**

### **Quick Commands:**

```powershell
# Check if keys are updated
cat d:\Expenses\.env | Select-String "STRIPE"

# Restart backend
cd d:\Expenses
docker-compose restart backend

# Check backend logs
docker-compose logs backend --tail=50

# Check backend status
docker-compose ps
```

### **What to Look For:**

**In .env file:**
- Keys should NOT say "your_secret_key_here"
- Keys should start with sk_test_ and pk_test_
- Keys should be 60+ characters long

**In backend logs:**
- Should see: "Started BackendApplication"
- Should NOT see: "Invalid API Key"

---

## 🎉 **YOU'RE ALMOST THERE!**

The payment system is **fully implemented** and **ready to work**.

The ONLY thing missing is **your Stripe API keys**.

**Get them now:**
1. Visit: https://dashboard.stripe.com/test/apikeys
2. Copy your keys
3. Update .env file
4. Restart backend
5. Test payments!

**It takes 5 minutes and then everything works!** 🚀

---

## 📚 **ADDITIONAL RESOURCES**

- **Stripe Dashboard:** https://dashboard.stripe.com/
- **Stripe API Keys:** https://dashboard.stripe.com/test/apikeys
- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Stripe Documentation:** https://stripe.com/docs

---

**Update your Stripe keys now and payments will work!** ✨
