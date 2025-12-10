# Render Deployment Guide

This guide will help you deploy the Expense App backend to Render.com.

## Prerequisites

- GitHub account with the repository pushed
- Render account (sign up at https://render.com)
- Brevo/Sendinblue SMTP credentials (optional, for email)
- Stripe API keys (optional, for payments)

## Deployment Options

### Option 1: Deploy Using Blueprint (Recommended)

This method uses the `render.yaml` file to automatically set up both the database and backend service.

#### Steps:

1. **Sign in to Render**
   - Go to https://dashboard.render.com
   - Sign in with your GitHub account

2. **Create New Blueprint**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository: `kishoreayphen-bit/Expense-App`
   - Render will detect the `render.yaml` file

3. **Review Configuration**
   - Database: `expenseapp-db` (PostgreSQL Free tier)
   - Web Service: `expenseapp-backend` (Docker, Free tier)
   - Region: Singapore (or choose your preferred region)

4. **Set Required Environment Variables**
   
   Before deploying, you need to set these variables manually in the Render dashboard:
   
   **Email Configuration (Optional but recommended):**
   ```
   SPRING_MAIL_USERNAME=your_brevo_email@example.com
   SPRING_MAIL_PASSWORD=your_brevo_smtp_key
   ```
   
   **Stripe Configuration (Optional):**
   ```
   STRIPE_API_KEY=sk_test_your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

5. **Deploy**
   - Click "Apply" to create the services
   - Render will:
     - Create PostgreSQL database
     - Build Docker image from your backend
     - Deploy the application
     - Run Flyway migrations automatically

6. **Wait for Deployment**
   - Initial build takes 5-10 minutes
   - Watch the logs for any errors
   - Once deployed, you'll get a URL like: `https://expenseapp-backend.onrender.com`

### Option 2: Manual Deployment

If you prefer to set up services manually:

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `expenseapp-db`
   - Database: `expenseapp`
   - User: `expenseapp`
   - Region: Singapore (or your preferred region)
   - Plan: Free
4. Click "Create Database"
5. **Save the connection details** (Internal Database URL)

#### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `expenseapp-backend`
   - Region: Singapore
   - Branch: `main`
   - Root Directory: Leave empty
   - Environment: Docker
   - Dockerfile Path: `./backend/Dockerfile`
   - Docker Context: `./backend`
   - Plan: Free

4. **Add Environment Variables:**

   Click "Advanced" and add these variables:

   **Database (Required):**
   ```
   SPRING_DATASOURCE_URL=<paste Internal Database URL from Step 1>
   SPRING_DATASOURCE_USERNAME=expenseapp
   SPRING_DATASOURCE_PASSWORD=<paste password from database>
   ```

   **JWT (Required):**
   ```
   JWT_SECRET=<generate a random 64-character string>
   JWT_EXPIRATION=86400000
   REFRESH_TOKEN_EXPIRATION=604800000
   ```

   **Application (Required):**
   ```
   SPRING_PROFILES_ACTIVE=prod
   SERVER_PORT=8080
   SPRING_JPA_HIBERNATE_DDL_AUTO=validate
   SPRING_FLYWAY_ENABLED=true
   CORS_ALLOWED_ORIGINS=*
   ```

   **Email (Optional):**
   ```
   SPRING_MAIL_HOST=smtp-relay.brevo.com
   SPRING_MAIL_PORT=587
   SPRING_MAIL_USERNAME=your_email@example.com
   SPRING_MAIL_PASSWORD=your_smtp_key
   ```

   **Stripe (Optional):**
   ```
   STRIPE_API_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   ```

5. **Set Health Check Path:**
   - Health Check Path: `/actuator/health`

6. Click "Create Web Service"

## Post-Deployment Configuration

### 1. Verify Deployment

Once deployed, test your API:

```bash
# Health check
curl https://your-app.onrender.com/actuator/health

# Should return: {"status":"UP"}
```

### 2. Test Authentication

```bash
# Register a user
curl -X POST https://your-app.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### 3. Update Mobile App

Update the API base URL in your mobile app:

**File:** `mobile/src/api/client.ts`

```typescript
// Change this line:
let API_BASE_URL = 'http://10.0.2.2:18080';

// To your Render URL:
let API_BASE_URL = 'https://your-app.onrender.com';
```

### 4. Database Access

To access your database:

1. Go to your database in Render Dashboard
2. Click "Connect" → "External Connection"
3. Use the provided credentials with any PostgreSQL client (pgAdmin, DBeaver, etc.)

**Connection String Format:**
```
postgresql://user:password@host:port/database
```

## Important Notes

### Free Tier Limitations

- **Web Service:** Spins down after 15 minutes of inactivity
- **Database:** 90-day expiration, 1GB storage limit
- **Cold Start:** First request after inactivity takes 30-60 seconds

### Upgrading to Paid Plan

For production use, consider upgrading:
- **Starter Plan ($7/month):** No spin down, better performance
- **Standard Plan ($25/month):** More resources, better for production

### Environment Variables Management

- Never commit sensitive keys to GitHub
- Use Render's environment variable management
- Update variables in Render Dashboard → Service → Environment

### Database Backups

Free tier doesn't include automatic backups. For production:
1. Upgrade to paid database plan
2. Or manually backup using `pg_dump`

## Troubleshooting

### Build Fails

**Error:** "Cannot find Dockerfile"
- **Solution:** Ensure `dockerfilePath` is `./backend/Dockerfile` and `dockerContext` is `./backend`

**Error:** "Maven build failed"
- **Solution:** Check logs, ensure all dependencies are in `pom.xml`

### Database Connection Issues

**Error:** "Connection refused"
- **Solution:** Verify `SPRING_DATASOURCE_URL` is the **Internal Database URL** from Render

**Error:** "Authentication failed"
- **Solution:** Check username and password match database credentials

### Application Won't Start

**Error:** "Port already in use"
- **Solution:** Ensure `SERVER_PORT=8080` (Render expects port 8080)

**Error:** "Flyway migration failed"
- **Solution:** Check database is empty or migrations are compatible

### Health Check Fails

- Ensure `/actuator/health` endpoint is accessible
- Check Spring Boot Actuator is enabled in `pom.xml`
- Verify application is actually running (check logs)

## Monitoring

### View Logs

1. Go to your service in Render Dashboard
2. Click "Logs" tab
3. Monitor for errors and performance issues

### Metrics

Render provides basic metrics:
- CPU usage
- Memory usage
- Request count
- Response times

## Auto-Deploy

With Blueprint or manual setup:
- Every push to `main` branch triggers automatic deployment
- Disable in Settings → "Auto-Deploy" if needed

## Custom Domain (Optional)

To use your own domain:

1. Go to Service → Settings
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `api.yourapp.com`)
4. Add CNAME record in your DNS provider:
   ```
   CNAME api.yourapp.com -> your-app.onrender.com
   ```

## Security Recommendations

1. **Use HTTPS:** Render provides free SSL certificates
2. **Secure JWT Secret:** Use a strong random string
3. **CORS Configuration:** In production, set specific origins instead of `*`
4. **Database:** Use strong passwords
5. **Environment Variables:** Never expose in logs or code

## Cost Estimation

**Free Tier (Current Setup):**
- Database: Free (90 days)
- Web Service: Free (with spin down)
- **Total: $0/month**

**Production Setup:**
- Database Starter: $7/month
- Web Service Starter: $7/month
- **Total: $14/month**

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: https://github.com/kishoreayphen-bit/Expense-App/issues

## Next Steps

After successful deployment:

1. ✅ Test all API endpoints
2. ✅ Update mobile app with production URL
3. ✅ Set up monitoring and alerts
4. ✅ Configure custom domain (optional)
5. ✅ Set up email service (Brevo)
6. ✅ Configure Stripe for payments
7. ✅ Create admin user account
8. ✅ Test complete user flow

---

**Congratulations!** Your Expense App backend is now deployed on Render! 🎉
