# 📧 EMAIL ISSUE & 👥 TEAMS GUIDE

## 🔍 **EMAIL ISSUE - CRITICAL FINDING**

### **You Haven't Sent a New Invitation!**

Looking at the logs:
- ❌ Last invitation attempt: `04:43:42` (BEFORE container restart)
- ❌ That attempt used OLD invalid credentials
- ✅ Containers restarted at `04:46:xx` with NEW credentials
- ❌ **NO new invitation attempts since restart!**

**The error you're seeing is from the OLD attempt, not a new one!**

---

## 🧪 **HOW TO TEST EMAIL NOW**

### **Option 1: Send from Mobile App (Recommended)**

1. **Open your Android Emulator**
2. **Open the Expense App**
3. **Login** (if not already logged in)
4. **Navigate:** Dashboard → Company Dashboard
5. **Click:** "Invite Member" or "Add Member" button
6. **Fill in:**
   - Email: `test@example.com`
   - Role: `EMPLOYEE`
7. **Click:** "Send Invitation"

**Watch the backend logs:**
```bash
docker-compose logs backend -f
```

**You should see:**
```
POST /api/v1/companies/1/members/invite
📧 Attempting to send invitation email to: test@example.com
✅ Email successfully sent to: test@example.com
```

---

### **Option 2: Test via PowerShell**

```powershell
# Run this in PowerShell
cd d:\Expenses

# Check what user exists
docker-compose exec postgres psql -U expense_user -d expenses -c "SELECT email FROM users LIMIT 5;"

# Then use the correct email/password to test
```

---

## 🎯 **VIEW SENT EMAILS**

**Go to:** https://ethereal.email/login

**Login:**
- Username: `agzkqvswjvjzyflk@ethereal.email`
- Password: `ZCbj8RnE389shzSuyJ`

**Click "Messages" tab** - all sent emails will appear here!

---

## 👥 **TEAMS / GROUPS - WHERE TO FIND**

### **Create a Team/Group:**

**In your mobile app:**

1. **From Dashboard:**
   - Look for "Groups" or "Teams" tab/button
   - OR: Navigate to the Groups screen

2. **Create Team Screen:**
   - File: `CreateTeamScreen.tsx` exists in your app
   - Should have a "Create Team" or "New Group" button

3. **Groups Screen:**
   - File: `GroupsScreen.tsx` - This is the main groups/teams list
   - Shows all your groups/teams

---

### **Navigation to Groups:**

**Likely paths:**
1. **Bottom Tab:** Look for "Groups" or "Teams" icon in bottom navigation
2. **Dashboard Menu:** From main dashboard, look for "Groups" or "Teams" option
3. **Profile Menu:** Might be under profile or settings

**Files that handle groups:**
- `GroupsScreen.tsx` - List of all groups
- `CreateTeamScreen.tsx` - Create new group/team
- `GroupInfoScreen.tsx` - View group details
- `GroupChatScreen.tsx` - Group chat
- `SplitScreen.tsx` - Split expenses within group

---

### **How Groups/Teams Work:**

1. **Create Group:**
   - Go to Groups screen
   - Click "Create" or "+" button
   - Enter group name
   - Select group type (TRIP, COUPLE, HOME, OFFICE, etc.)
   - Add members

2. **View Groups:**
   - Groups screen shows all your groups
   - Can be owner or member of groups

3. **Group Features:**
   - Add expenses to group
   - Split expenses among members
   - Group chat
   - View group statistics

---

## 🔍 **FINDING GROUPS IN YOUR APP**

### **Check Navigation:**

Look in your app's bottom navigation or drawer menu for:
- "Groups" icon/button
- "Teams" icon/button
- "Split" icon/button

**If you can't find it:**
1. Open the app
2. Check the main dashboard
3. Look for a menu icon (☰)
4. Check all tabs in bottom navigation

---

## 📝 **CURRENT STATUS**

### **Email Configuration:**
```
✅ SMTP_HOST=smtp.ethereal.email
✅ SMTP_PORT=587
✅ SMTP_USERNAME=agzkqvswjvjzyflk@ethereal.email
✅ SMTP_PASSWORD=ZCbj8RnE389shzSuyJ
✅ FROM_EMAIL=agzkqvswjvjzyflk@ethereal.email
```

### **Backend:**
```
✅ Running and healthy
✅ Has correct SMTP credentials
✅ Ready to send emails
```

### **Mobile App:**
```
✅ Configured for emulator (http://10.0.2.2:18080)
✅ Has Groups/Teams screens
✅ Ready to use
```

---

## 🚀 **NEXT STEPS**

### **For Email Testing:**

1. **Open terminal:**
   ```bash
   docker-compose logs backend -f
   ```

2. **Send invitation from app**

3. **Watch logs for success message**

4. **Check Ethereal inbox**

---

### **For Teams/Groups:**

1. **Open your mobile app**

2. **Look for "Groups" or "Teams" in:**
   - Bottom navigation tabs
   - Dashboard menu
   - Side drawer menu

3. **Click "Create" or "+" to create new group**

4. **Fill in:**
   - Group name
   - Group type
   - Add members

---

## ❓ **TROUBLESHOOTING**

### **If you can't find Groups screen:**

**Tell me:**
1. What tabs do you see in bottom navigation?
2. What options are in the main menu?
3. Take a screenshot of your app's main screen

**I can help you navigate to the Groups screen!**

---

### **If email still fails:**

**Tell me:**
1. Did you send a NEW invitation after container restart?
2. What do the backend logs show?
3. What message does the app show?

---

## 📊 **SUMMARY**

**Email Issue:**
- ❌ You're seeing OLD error from before restart
- ✅ Backend NOW has correct credentials
- 🎯 **Send a NEW invitation to test!**

**Teams/Groups:**
- ✅ App has `GroupsScreen.tsx` and `CreateTeamScreen.tsx`
- ✅ Look for "Groups" or "Teams" in app navigation
- ✅ Can create groups, add members, split expenses

---

**Send a NEW invitation NOW and check the logs!** 🚀
