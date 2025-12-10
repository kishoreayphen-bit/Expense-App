# 🚀 Quick Start Guide

## ✅ What's New

1. **Headers** - More spacing (40px bottom padding)
2. **Team Creation UI** - Beautiful new screen
3. **Auto-Rebuild** - Backend reloads in 5-10 seconds

---

## 🎯 Quick Commands

### **Start Development Mode (Auto-Rebuild):**
```bash
cd d:\Expenses
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### **Watch Logs:**
```bash
docker-compose logs -f backend
```

### **Stop Everything:**
```bash
docker-compose down
```

### **Full Rebuild (When Needed):**
```bash
docker-compose up -d --build backend
```

---

## 📱 Test Team Creation UI

### **Step 1: Add to Navigation**

Open your navigation file and add:

```typescript
import CreateTeamScreen from './src/screens/CreateTeamScreen';

// In your stack navigator
<Stack.Screen 
  name="CreateTeam" 
  component={CreateTeamScreen}
  options={{ headerShown: false }}
/>
```

### **Step 2: Navigate to It**

From any screen:

```typescript
navigation.navigate('CreateTeam');
```

### **Step 3: Test It**

1. Enter team name
2. Search and select members
3. Click "Create Team"
4. Verify success!

---

## 🔄 Test Auto-Rebuild

### **Step 1: Start Dev Mode**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up backend
```

### **Step 2: Make a Change**

Edit any `.java` file and save.

### **Step 3: Watch It Reload**

Look for this in logs:
```
[restartedMain] c.e.ExpenseBackendApplication : Started in 2.345 seconds
```

### **Step 4: Test Immediately**

No manual rebuild needed! Changes are live!

---

## 📧 Test SMTP Email

### **Step 1: Monitor Logs**
```bash
docker-compose logs backend -f
```

### **Step 2: Send Invitation**

1. Open app → Company Dashboard
2. Click "Invite Member"
3. Enter email
4. Send

### **Step 3: Check Results**

**✅ Success:**
```
📧 SENDING INVITATION EMAIL
✅ Email successfully sent
```

**❌ Failed:**
```
❌ Failed to send invitation email: Authentication failed
```

**Solution:** See `SMTP_FINAL_DEBUG.md`

---

## 📚 Full Documentation

- **`IMPLEMENTATION_SUMMARY.md`** - Complete details
- **`AUTO_REBUILD_GUIDE.md`** - Auto-rebuild guide
- **`SMTP_FINAL_DEBUG.md`** - Email troubleshooting
- **`COMPLETE_SUMMARY.md`** - UI enhancements

---

## 🎉 You're All Set!

**Daily Workflow:**
1. Start: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
2. Code: Edit and save
3. Test: Instant feedback!
4. Stop: `docker-compose down`

**Happy coding!** 🚀
