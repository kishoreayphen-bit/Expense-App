# 📧 EMAIL SETUP & 👥 TEAM CREATION GUIDE

## 🎯 **CURRENT STATUS**

### ✅ **What's Working:**
- Backend is running and healthy
- Docker containers are configured
- API endpoints are functional
- Invitation API works (Status: 200)
- Auto-rebuild is configured

### ❌ **What Needs Your Action:**
- **SMTP credentials** - Need valid Mailtrap account

---

## 📧 **PART 1: EMAIL SETUP WITH MAILTRAP**

### **Why Mailtrap?**
- ✅ **100% reliable** for development
- ✅ **Easy setup** (2 minutes)
- ✅ **Web interface** to view emails
- ✅ **Free tier** available
- ✅ **No authentication issues**

### **Setup Steps:**

#### **Step 1: Create Mailtrap Account (1 minute)**

1. **Go to:** https://mailtrap.io/
2. **Click:** "Sign Up" (top right)
3. **Sign up with:**
   - Your email address, OR
   - Google account, OR
   - GitHub account
4. **Verify** your email (check inbox)

#### **Step 2: Get SMTP Credentials (30 seconds)**

1. **After login**, you'll see "Email Testing"
2. **Click:** "Inboxes" in left sidebar
3. **Click:** "My Inbox" (or create new inbox)
4. **You'll see SMTP credentials:**
   ```
   Host: sandbox.smtp.mailtrap.io
   Port: 2525 or 587
   Username: [your-username]
   Password: [your-password]
   ```
5. **Copy these credentials!**

#### **Step 3: Update .env File**

Open `d:\Expenses\.env` and update lines 43-47:

```bash
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=your-mailtrap-username-here
SMTP_PASSWORD=your-mailtrap-password-here
FROM_EMAIL=noreply@expenseapp.com
```

**Replace:**
- `your-mailtrap-username-here` with your actual username
- `your-mailtrap-password-here` with your actual password

#### **Step 4: Restart Backend**

```bash
cd d:\Expenses
docker-compose restart backend
```

Wait 10 seconds for backend to start.

#### **Step 5: Test Email Sending**

```bash
powershell -ExecutionPolicy Bypass -File test-mailtrap.ps1
```

**Expected result:**
```
✅ Invitation sent! Status: 200
✅ Email successfully sent
```

#### **Step 6: View Email in Mailtrap**

1. **Go back to:** https://mailtrap.io/
2. **Click:** "Inboxes" → "My Inbox"
3. **You'll see the invitation email!**
4. **Click on it** to view full content

---

## 👥 **PART 2: TEAM CREATION IN COMPANY MODE**

### **📍 WHERE TO CREATE TEAMS**

Your app has a dedicated **Team Creation Screen** but it's accessed through **Groups**.

**In your mobile app, "Teams" and "Groups" are the SAME thing!**

---

### **🎯 HOW TO CREATE A TEAM**

#### **Method 1: From Groups Screen (Main Way)**

1. **Open your mobile app**
2. **Look for bottom navigation tabs**
3. **Find and tap:** "Groups" tab (icon: 👥 or similar)
4. **You'll see:** List of existing groups/teams
5. **Tap:** "+" button (top right) or "Create Team" button
6. **Fill in:**
   - **Team Name:** e.g., "Marketing Team"
   - **Description:** (optional)
   - **Select Members:** Choose from company members
7. **Tap:** "Create" or "Save"
8. **Done!** Team is created

#### **Method 2: From Company Dashboard**

1. **Open your mobile app**
2. **Go to:** Company Dashboard
3. **Look for:** "Teams" or "Groups" card/button
4. **Tap it** to go to Groups screen
5. **Follow Method 1 steps above**

---

### **📱 TEAM CREATION SCREEN DETAILS**

**File:** `CreateTeamScreen.tsx`

**Features:**
- ✅ Enter team name
- ✅ Add description
- ✅ Select multiple members
- ✅ Search for members
- ✅ Create team with selected members

**What happens when you create a team:**
1. Team is saved to database
2. Selected members are added
3. You become the team owner
4. Team appears in Groups list
5. You can add expenses to this team
6. You can split expenses among team members

---

### **🔍 WHERE TO FIND TEAMS AFTER CREATION**

#### **View All Teams:**
1. **Open app**
2. **Tap:** "Groups" tab (bottom navigation)
3. **You'll see:** All your teams listed

#### **View Team Details:**
1. **Go to:** Groups screen
2. **Tap on a team**
3. **You'll see:**
   - Team name
   - Members list
   - Team expenses
   - Split expenses
   - Team chat (if available)

#### **Team Actions:**
- **Add Expense:** Tap "+" in team details
- **Split Expense:** Create split among team members
- **Add Members:** Tap "Add Member" button
- **View Stats:** See team spending statistics

---

### **📊 TEAM VS GROUP - CLARIFICATION**

**In your app:**
- **"Team"** = **"Group"** (same thing!)
- **CreateTeamScreen** creates a **Group**
- **GroupsScreen** shows all **Teams/Groups**
- **GroupInfoScreen** shows **Team details**

**Why the confusion?**
- Code uses "Group" terminology
- UI might show "Team" terminology
- They refer to the same feature!

---

### **🎯 COMPLETE TEAM WORKFLOW**

#### **1. Create Team**
- Groups tab → "+" button → Fill details → Create

#### **2. Add Members**
- Team details → "Add Member" → Select users → Add

#### **3. Add Expense to Team**
- Team details → "Add Expense" → Fill details → Save

#### **4. Split Expense**
- Team details → "Split Expense" → Select members → Split

#### **5. View Team Activity**
- Team details → See all expenses, splits, and activity

---

## 🔧 **AUTO-REBUILD CONFIGURATION**

### **Current Setup:**
- ✅ Backend auto-rebuilds when you run: `docker-compose up -d --build backend`
- ✅ Changes to Java code require rebuild
- ✅ Changes to `.env` require restart only

### **To Rebuild After Code Changes:**

```bash
cd d:\Expenses
docker-compose up -d --build backend
```

### **To Restart After .env Changes:**

```bash
cd d:\Expenses
docker-compose restart backend
```

---

## 📝 **QUICK REFERENCE**

### **Email Testing:**
```bash
# After updating .env with Mailtrap credentials:
docker-compose restart backend
powershell -ExecutionPolicy Bypass -File test-mailtrap.ps1
```

### **View Emails:**
- Go to: https://mailtrap.io/
- Click: Inboxes → My Inbox
- See all test emails

### **Create Team:**
1. Open app
2. Groups tab
3. "+" button
4. Fill details
5. Create

### **View Teams:**
1. Open app
2. Groups tab
3. See all teams

---

## ✅ **SUMMARY**

### **Email Setup:**
1. ✅ Sign up at Mailtrap.io
2. ✅ Get SMTP credentials
3. ✅ Update .env file
4. ✅ Restart backend
5. ✅ Test email sending
6. ✅ View emails in Mailtrap

### **Team Creation:**
1. ✅ Open app
2. ✅ Go to Groups tab
3. ✅ Tap "+" button
4. ✅ Fill team details
5. ✅ Select members
6. ✅ Create team
7. ✅ Team appears in Groups list

### **Auto-Rebuild:**
- ✅ Code changes: `docker-compose up -d --build backend`
- ✅ .env changes: `docker-compose restart backend`

---

## 🚀 **NEXT STEPS**

1. **Sign up for Mailtrap** (2 minutes)
2. **Update .env** with credentials
3. **Restart backend**
4. **Test email** - it will work!
5. **Open mobile app**
6. **Go to Groups tab**
7. **Create your first team!**

---

**Need help? Check:**
- Mailtrap docs: https://mailtrap.io/docs/
- Your app's Groups screen
- CreateTeamScreen.tsx for team features
