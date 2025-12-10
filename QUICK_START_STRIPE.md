# 🚀 STRIPE PAYMENT - QUICK START GUIDE

## ⚡ **5-MINUTE SETUP**

### **Step 1: Get Stripe Keys (2 minutes)**
1. Go to: **https://stripe.com/** → Sign up (free)
2. Go to: **https://dashboard.stripe.com/test/apikeys**
3. Copy your keys:
   - **Publishable key:** `pk_test_...`
   - **Secret key:** `sk_test_...` (click "Reveal")

### **Step 2: Update .env (1 minute)**
Open `d:\Expenses\.env` and update:
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### **Step 3: Restart Backend (1 minute)**
```powershell
cd d:\Expenses
docker-compose restart backend
```

### **Step 4: Install Stripe Package (1 minute)**
```powershell
cd d:\Expenses\mobile
npm install @stripe/stripe-react-native
```

### **Step 5: Test! (30 seconds)**
1. Open mobile app
2. View an expense with split shares
3. Click **"Pay Now"** button
4. Use test card: **4242 4242 4242 4242**
5. Click **"Pay"**
6. **Success!** 🎉

---

## 💳 **TEST CARD**
```
Card Number: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
ZIP: 12345
```

---

## ✅ **WHAT'S IMPLEMENTED**

### **Backend:**
- ✅ Stripe Java SDK integrated
- ✅ Payment API endpoints created
- ✅ Database table for payments
- ✅ Auto-rebuild configured

### **Mobile:**
- ✅ Beautiful payment screen
- ✅ "Pay Now" button on pending shares
- ✅ Success/error handling
- ✅ Navigation configured

---

## 🎨 **FEATURES**

- **Beautiful UI** - Modern, clean design
- **Secure** - Stripe-powered payments
- **Test Mode** - No real money charged
- **Status Tracking** - PENDING → SETTLED
- **Auto-Rebuild** - Backend rebuilds on changes

---

## 📱 **HOW TO USE**

1. **Create expense** with split shares
2. **View expense details**
3. **Click "Pay Now"** on pending share
4. **Enter test card** (4242 4242 4242 4242)
5. **Click "Pay"**
6. **Done!** Status updates to SETTLED

---

## 🆘 **TROUBLESHOOTING**

**Backend not starting?**
```powershell
docker-compose logs backend --tail=50
```

**Mobile app issues?**
```powershell
cd mobile
npm install
npx expo start --clear
```

**Stripe keys not working?**
- Make sure you copied the FULL key
- Use test keys (pk_test_ and sk_test_)
- No spaces in the keys

---

## 📚 **FULL DOCUMENTATION**

See `STRIPE_PAYMENT_COMPLETE.md` for complete details!

---

**Ready? Get your Stripe keys and start testing!** 🚀
