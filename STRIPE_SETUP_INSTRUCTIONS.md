# 🔧 STRIPE PAYMENT SETUP - COMPLETE GUIDE

## 📋 **WHAT'S BEEN IMPLEMENTED**

### **Backend:**
✅ Stripe Java SDK added to pom.xml
✅ Payment entity and repository created
✅ Payment service with Stripe integration
✅ Payment controller with REST API endpoints
✅ Database migration for payments table
✅ Stripe configuration in application.properties
✅ Environment variables in docker-compose.yml

### **Endpoints Created:**
- `GET /api/v1/payments/config` - Get Stripe publishable key
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/confirm` - Confirm payment
- `GET /api/v1/payments/split-share/{id}` - Get payment by split share
- `GET /api/v1/payments/my-payments` - Get user's payment history
- `POST /api/v1/payments/webhook` - Stripe webhook handler

---

## 🔑 **STEP 1: GET STRIPE API KEYS**

### **Create Stripe Account:**
1. Go to: **https://stripe.com/**
2. Click **"Sign up"**
3. Create your account (free)

### **Get Test API Keys:**
1. Login to Stripe Dashboard
2. Go to: **https://dashboard.stripe.com/test/apikeys**
3. You'll see:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal test key"

### **Copy Your Keys:**
```
Publishable key: pk_test_51xxxxxxxxxxxxx
Secret key: sk_test_51xxxxxxxxxxxxx
```

---

## 🔧 **STEP 2: UPDATE .ENV FILE**

Open `d:\Expenses\.env` and update these lines:

```bash
# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Replace:**
- `sk_test_YOUR_ACTUAL_SECRET_KEY_HERE` with your actual secret key
- `pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE` with your actual publishable key

---

## 📱 **STEP 3: INSTALL STRIPE IN MOBILE APP**

Run these commands:

```powershell
cd d:\Expenses\mobile
npm install @stripe/stripe-react-native
npx expo install expo-dev-client
```

---

## 🔄 **STEP 4: REBUILD BACKEND**

The backend is already building! Wait for it to complete.

Check status:
```powershell
cd d:\Expenses
docker-compose ps
```

If needed, rebuild manually:
```powershell
docker-compose up -d --build backend
```

---

## ✅ **STEP 5: TEST STRIPE INTEGRATION**

### **Test Card Numbers (Stripe Test Mode):**

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

**Payment Declined:**
```
Card: 4000 0000 0000 0002
```

**Requires Authentication (3D Secure):**
```
Card: 4000 0025 0000 3155
```

---

## 🎨 **NEXT STEPS**

I'm creating:
1. ✅ Beautiful PaymentScreen.tsx
2. ✅ Link to Split Details "Pay" button
3. ✅ Update UI based on payment status
4. ✅ Payment success/failure handling

---

## 📝 **IMPORTANT NOTES**

### **Test Mode:**
- All keys starting with `pk_test_` and `sk_test_` are for testing
- No real money is charged
- Use test card numbers only

### **Production:**
- Get live keys from: https://dashboard.stripe.com/apikeys
- Keys start with `pk_live_` and `sk_live_`
- Real payments will be processed

### **Security:**
- Never commit `.env` file to Git
- Keep secret keys private
- Use environment variables only

---

## 🆘 **TROUBLESHOOTING**

### **Backend Build Fails:**
```powershell
docker-compose logs backend --tail=50
```

### **Stripe Keys Not Working:**
- Make sure you copied the full key (no spaces)
- Use test keys (pk_test_ and sk_test_)
- Check Stripe Dashboard for key status

### **Mobile App Issues:**
```powershell
cd d:\Expenses\mobile
npm install
npx expo start --clear
```

---

**Ready? Get your Stripe keys and update the .env file!** 🚀
