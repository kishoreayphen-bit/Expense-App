# 🔧 Fix "User account is disabled" Error

## ❌ **Error Details**

```
ERROR [API Error] {
  "message": "Request failed with status code 401",
  "response": {
    "message": "User account is disabled",
    "status": "error"
  },
  "status": 401
}
```

**Cause:** The admin@demo.local account has `enabled = false` in the database.

---

## ✅ **Solution Options**

### **Option 1: Using pgAdmin (Easiest - GUI)**

1. **Open pgAdmin:**
   ```
   http://localhost:5050
   ```

2. **Login:**
   - Email: `admin@example.com` (or check your .env for PGADMIN_EMAIL)
   - Password: `admin123` (or check your .env for PGADMIN_PASSWORD)

3. **Connect to Database:**
   - Right-click "Servers" → "Register" → "Server"
   - **General Tab:**
     - Name: `Expense DB`
   - **Connection Tab:**
     - Host: `postgres`
     - Port: `5432`
     - Database: `expenses` (or check POSTGRES_DB in .env)
     - Username: `expense_user` (or check POSTGRES_USER in .env)
     - Password: `expense_pass` (or check POSTGRES_PASSWORD in .env)

4. **Run SQL Query:**
   - Navigate to: Servers → Expense DB → Databases → expenses
   - Click "Query Tool" button (top toolbar)
   - Paste this SQL:
   ```sql
   -- Enable admin account
   UPDATE users 
   SET enabled = true 
   WHERE email = 'admin@demo.local';
   
   -- Verify
   SELECT id, name, email, role, enabled 
   FROM users 
   WHERE email = 'admin@demo.local';
   ```
   - Click "Execute" (▶️ button)

5. **Verify Result:**
   - Should show: `enabled = true` for admin@demo.local

---

### **Option 2: Using Docker CLI (Fast)**

1. **Connect to PostgreSQL container:**
   ```bash
   docker exec -it expense_postgres psql -U expense_user -d expenses
   ```

2. **Run SQL commands:**
   ```sql
   -- Enable admin account
   UPDATE users SET enabled = true WHERE email = 'admin@demo.local';
   
   -- Verify
   SELECT id, name, email, role, enabled FROM users WHERE email = 'admin@demo.local';
   
   -- Exit
   \q
   ```

---

### **Option 3: Using SQL File (Automated)**

1. **Copy SQL file to container:**
   ```bash
   docker cp backend/fix-disabled-admin.sql expense_postgres:/tmp/
   ```

2. **Execute SQL file:**
   ```bash
   docker exec -it expense_postgres psql -U expense_user -d expenses -f /tmp/fix-disabled-admin.sql
   ```

---

### **Option 4: Enable All Demo Accounts**

If you want to enable ALL demo accounts at once:

```sql
-- Enable all demo accounts
UPDATE users 
SET enabled = true 
WHERE email LIKE '%@demo.local';

-- Verify all demo accounts
SELECT id, name, email, role, enabled 
FROM users 
WHERE email LIKE '%@demo.local'
ORDER BY role, email;
```

---

## 🧪 **Verify Fix**

### **1. Check Database:**
```sql
SELECT id, name, email, role, enabled 
FROM users 
WHERE email = 'admin@demo.local';
```

**Expected Result:**
```
id | name  | email              | role        | enabled
---+-------+--------------------+-------------+---------
1  | Admin | admin@demo.local   | SUPER_ADMIN | true
```

### **2. Test Login in Mobile App:**
1. Logout from current session
2. Login with:
   - Email: `admin@demo.local`
   - Password: `Admin@123`
3. Should login successfully
4. No more "User account is disabled" error

---

## 🔍 **Why This Happened**

The `users` table has an `enabled` column (boolean) that defaults to `true`:

```java
// User.java line 43
@Column(nullable = false)
private boolean enabled = true;
```

**Possible Causes:**
1. Manual database update set `enabled = false`
2. Account was disabled through admin panel
3. Database migration or seed data set it to false
4. Security feature disabled the account after failed login attempts

---

## 🚀 **Quick Fix Commands**

### **Windows PowerShell:**
```powershell
# Connect to database
docker exec -it expense_postgres psql -U expense_user -d expenses

# Run in psql:
UPDATE users SET enabled = true WHERE email = 'admin@demo.local';
SELECT id, name, email, role, enabled FROM users WHERE email = 'admin@demo.local';
\q
```

### **Linux/Mac Terminal:**
```bash
# Connect to database
docker exec -it expense_postgres psql -U expense_user -d expenses

# Run in psql:
UPDATE users SET enabled = true WHERE email = 'admin@demo.local';
SELECT id, name, email, role, enabled FROM users WHERE email = 'admin@demo.local';
\q
```

### **One-Liner (No psql prompt):**
```bash
docker exec -it expense_postgres psql -U expense_user -d expenses -c "UPDATE users SET enabled = true WHERE email = 'admin@demo.local';"
```

---

## 📊 **Database Connection Info**

From `docker-compose.yml`:

| Setting | Default Value | Environment Variable |
|---------|---------------|---------------------|
| **Host** | `localhost` (outside Docker) or `postgres` (inside Docker) | - |
| **Port** | `5432` | `POSTGRES_PORT` |
| **Database** | `expenses` | `POSTGRES_DB` |
| **Username** | `expense_user` | `POSTGRES_USER` |
| **Password** | `expense_pass` | `POSTGRES_PASSWORD` |
| **pgAdmin URL** | `http://localhost:5050` | - |
| **pgAdmin Email** | `admin@example.com` | `PGADMIN_EMAIL` |
| **pgAdmin Password** | `admin123` | `PGADMIN_PASSWORD` |

---

## 🛠️ **Troubleshooting**

### **Issue: Can't connect to database**
```bash
# Check if postgres container is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Check logs
docker logs expense_postgres
```

### **Issue: Wrong credentials**
```bash
# Check your .env file for actual credentials
cat .env | grep POSTGRES

# Or use defaults from docker-compose.yml
```

### **Issue: pgAdmin won't load**
```bash
# Check if pgAdmin is running
docker ps | grep pgadmin

# Start pgAdmin
docker-compose up -d pgadmin

# Check logs
docker logs expense_pgadmin
```

---

## ✅ **After Fix**

Once you've enabled the account:

1. ✅ Logout from mobile app
2. ✅ Login again with admin@demo.local / Admin@123
3. ✅ Switch to company mode
4. ✅ Test approval UI
5. ✅ Test member management

---

## 📝 **Prevention**

To prevent this in the future:

### **1. Add Database Seed Script**
Create `backend/src/main/resources/data.sql`:
```sql
-- Ensure demo accounts are always enabled
UPDATE users SET enabled = true WHERE email LIKE '%@demo.local';
```

### **2. Add Health Check**
Monitor account status in your admin dashboard.

### **3. Add Logging**
Log when accounts are disabled:
```java
@PreUpdate
public void onUpdate() {
    if (!this.enabled) {
        log.warn("User account disabled: {}", this.email);
    }
}
```

---

## 🎯 **Summary**

**Problem:** admin@demo.local account is disabled in database  
**Solution:** Run SQL to enable it  
**Quick Fix:** `docker exec -it expense_postgres psql -U expense_user -d expenses -c "UPDATE users SET enabled = true WHERE email = 'admin@demo.local';"`  
**Verify:** Login should work without 401 error

---

**Last Updated:** December 1, 2025  
**Status:** ✅ **READY TO FIX**
