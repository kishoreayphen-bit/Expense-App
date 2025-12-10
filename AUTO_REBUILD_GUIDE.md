# 🔄 Auto-Rebuild Setup Guide

## ✅ What's Been Configured

I've set up automatic backend rebuilding when you make code changes. Here's what was added:

### **1. Spring Boot DevTools**
- Added to `pom.xml` for hot-reload capability
- Automatically restarts the application when classes change
- Preserves application state during restart

### **2. Development Docker Configuration**
- Created `docker-compose.dev.yml` for development mode
- Created `Dockerfile.dev` optimized for development
- Source code is mounted as a volume for live updates

### **3. Maven Cache**
- Maven dependencies are cached in a Docker volume
- Speeds up rebuilds significantly

---

## 🚀 How to Use Auto-Rebuild

### **Option 1: Development Mode (Recommended)**

Start the backend in development mode with auto-reload:

```bash
cd d:\Expenses

# Start backend in dev mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up backend

# Or start all services with dev backend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**What happens:**
- Backend starts with Spring Boot DevTools enabled
- When you save a `.java` file, Spring Boot automatically:
  1. Detects the change
  2. Recompiles the class
  3. Restarts the application context
  4. Preserves your session (in most cases)

**Rebuild time:** ~5-10 seconds (much faster than full rebuild!)

---

### **Option 2: Manual Rebuild (Production Mode)**

If you prefer manual control:

```bash
cd d:\Expenses

# Rebuild and restart backend
docker-compose up -d --build backend

# Or force recreate
docker-compose up -d --force-recreate backend
```

**Rebuild time:** ~2-3 minutes (full rebuild)

---

## 📝 What Gets Auto-Reloaded

### **✅ Automatically Reloaded:**
- Java source files (`.java`)
- Configuration files (`application.properties`)
- Static resources
- Templates

### **❌ Requires Manual Restart:**
- `pom.xml` changes (new dependencies)
- Database migrations (Flyway scripts)
- Environment variables (`.env` file)
- Dockerfile changes

---

## 🎯 Workflow Examples

### **Example 1: Fixing SMTP Email**

1. **Start dev mode:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up backend
   ```

2. **Edit EmailService.java:**
   ```bash
   # Open in your IDE
   code d:\Expenses\backend\src\main\java\com\expenseapp\email\EmailService.java
   ```

3. **Make changes and save**

4. **Watch logs:**
   ```
   [restartedMain] o.s.b.d.a.OptionalLiveReloadServer : LiveReload server is running on port 35729
   [restartedMain] c.e.ExpenseBackendApplication : Started ExpenseBackendApplication in 2.345 seconds
   ```

5. **Test immediately** - No manual rebuild needed!

---

### **Example 2: Adding New Endpoint**

1. **Create new controller method:**
   ```java
   @GetMapping("/api/v1/test")
   public ResponseEntity<String> test() {
       return ResponseEntity.ok("Auto-reload works!");
   }
   ```

2. **Save file**

3. **Wait 5-10 seconds**

4. **Test endpoint:**
   ```bash
   curl http://localhost:18080/api/v1/test
   ```

---

### **Example 3: Updating Dependencies**

When you add a new dependency to `pom.xml`:

1. **Edit pom.xml** and save

2. **Restart backend:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart backend
   ```

3. **Or rebuild if needed:**
   ```bash
   docker-compose up -d --build backend
   ```

---

## 🔍 Monitoring Auto-Reload

### **Watch Logs in Real-Time:**

```bash
# Terminal 1: Watch backend logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# Terminal 2: Make code changes
# You'll see reload messages in Terminal 1
```

### **Look for these messages:**

**✅ Successful reload:**
```
[restartedMain] o.s.b.d.a.ConditionEvaluationDeltaLoggingListener : Condition evaluation delta:
[restartedMain] c.e.ExpenseBackendApplication : Started ExpenseBackendApplication in 2.345 seconds
```

**❌ Reload failed:**
```
[restartedMain] o.s.boot.SpringApplication : Application run failed
```

---

## ⚡ Performance Tips

### **1. Use Dev Mode for Active Development**
- Much faster than full rebuilds
- Preserves application state
- Instant feedback

### **2. Use Production Mode for Testing**
- Full rebuild ensures clean state
- Better for testing deployment
- Closer to production environment

### **3. Optimize Your Workflow**

**Fast iteration:**
```bash
# Start once
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Edit code, save, test
# No manual commands needed!

# Stop when done
docker-compose down
```

**Full rebuild when needed:**
```bash
# After pom.xml changes
docker-compose up -d --build backend

# After .env changes
docker-compose up -d --force-recreate backend
```

---

## 🐛 Troubleshooting

### **Issue 1: Changes Not Detected**

**Symptoms:** You save a file but nothing happens

**Solutions:**
1. Check if dev mode is running:
   ```bash
   docker-compose ps
   ```

2. Verify source is mounted:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml config
   ```

3. Restart backend:
   ```bash
   docker-compose restart backend
   ```

---

### **Issue 2: Slow Reloads**

**Symptoms:** Reloads take >30 seconds

**Solutions:**
1. Check Docker resources (CPU/Memory)
2. Clear Maven cache:
   ```bash
   docker volume rm expenses_maven_cache
   docker-compose up -d --build backend
   ```

3. Use production mode instead:
   ```bash
   docker-compose up -d backend
   ```

---

### **Issue 3: Application Won't Start**

**Symptoms:** Backend crashes on reload

**Solutions:**
1. Check logs:
   ```bash
   docker-compose logs backend
   ```

2. Fix compilation errors in code

3. Rebuild from scratch:
   ```bash
   docker-compose down
   docker-compose up -d --build backend
   ```

---

## 📊 Comparison: Dev vs Production Mode

| Feature | Dev Mode | Production Mode |
|---------|----------|-----------------|
| **Reload Time** | 5-10 seconds | 2-3 minutes |
| **Auto-Reload** | ✅ Yes | ❌ No |
| **State Preservation** | ✅ Yes | ❌ No |
| **Resource Usage** | Higher | Lower |
| **Best For** | Active development | Testing, deployment |
| **Command** | `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up` | `docker-compose up` |

---

## 🎯 Quick Reference

### **Start Dev Mode:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend
```

### **Watch Logs:**
```bash
docker-compose logs -f backend
```

### **Stop Dev Mode:**
```bash
docker-compose down
```

### **Full Rebuild:**
```bash
docker-compose up -d --build backend
```

### **Force Recreate:**
```bash
docker-compose up -d --force-recreate backend
```

---

## ✅ Summary

**Auto-rebuild is now configured!** 🎉

**For daily development:**
1. Start: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
2. Code: Edit `.java` files and save
3. Test: Changes apply automatically in 5-10 seconds
4. Stop: `docker-compose down`

**For production testing:**
1. Build: `docker-compose up -d --build backend`
2. Test: Verify everything works
3. Deploy: Use production configuration

---

**Happy coding with instant feedback!** 🚀
