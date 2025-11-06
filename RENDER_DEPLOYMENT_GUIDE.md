# Render.com Deployment Guide

## Quick Deployment Steps

### 1. Prerequisites

- [ ] GitHub repository with latest code
- [ ] Firebase project created
- [ ] Firebase service account JSON downloaded
- [ ] All environment variables ready

### 2. Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:

**Service Name:** `bold-trading-platform` (or your choice)

**Environment:** `Python`

**Region:** Choose closest to your users

**Branch:** `main` (or your production branch)

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
cd backend && pip install -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Plan:** Select appropriate plan (Starter or higher recommended)

### 3. Configure Environment Variables

Go to "Environment" tab and add:

#### Firebase Configuration
```
FIREBASE_API_KEY=AIzaSyDqAsiITYyPK9bTuGGz7aVBkZ7oLB2Kt3U
FIREBASE_DATABASE_URL=https://onlineaviator-aa5a7-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=onlineaviator-aa5a7
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

**IMPORTANT for FIREBASE_CREDENTIALS_JSON:**
- Copy your entire service account JSON
- Remove ALL newlines (make it single line)
- Paste as environment variable value
- Render will handle it correctly

#### Security Keys
```
JWT_SECRET_KEY=your-super-secret-jwt-key-minimum-32-characters-long
ENCRYPTION_KEY=exactly-32-chars-for-aes-256-
```

**Generate secure keys:**
```bash
# Generate JWT secret (min 32 chars)
openssl rand -base64 32

# Generate encryption key (exactly 32 chars)
openssl rand -base64 32 | cut -c1-32
```

#### Server Configuration
```
PORT=8000
NODE_ENV=production
RENDER_SERVICE_ID=(auto-populated by Render)
```

#### Frontend API URL (if using separate frontend)
```
VITE_API_URL=https://your-service.onrender.com
```

### 4. Deploy

1. Click "Create Web Service"
2. Render will:
   - Clone your repository
   - Install dependencies
   - Build frontend
   - Start backend server
3. Monitor build logs for errors
4. Wait for deployment to complete (~5-10 minutes)

### 5. Verify Deployment

#### Health Check
```bash
curl https://your-service.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T..."
}
```

#### Environment Validation
SSH into Render shell and run:
```bash
python scripts/check_envs.py
```

Should show all green checkmarks.

### 6. Post-Deployment Checks

- [ ] Health endpoint returns 200
- [ ] Login works (Firebase auth)
- [ ] Can add API keys (saved to Firebase)
- [ ] Balance fetching works
- [ ] Integrations health check shows connected exchanges
- [ ] Auto-trading settings save correctly

---

## Troubleshooting

### Build Fails

**Issue:** `npm install` fails

**Solution:**
- Check `package.json` is valid
- Ensure all dependencies are available
- Check Node version (use LTS)

**Issue:** Python packages fail

**Solution:**
- Verify `requirements.txt` has correct package names
- Check for version conflicts
- Use: `pip install -r requirements.txt --no-cache-dir`

### Runtime Issues

**Issue:** 502 Bad Gateway

**Solution:**
- Check backend logs
- Ensure PORT is `$PORT` (Render provides this)
- Verify uvicorn command is correct

**Issue:** Firebase connection fails

**Solution:**
- Verify `FIREBASE_CREDENTIALS_JSON` is properly formatted
- Check `FIREBASE_DATABASE_URL` is correct
- Ensure Firebase Realtime Database is enabled

**Issue:** API keys not loading

**Solution:**
- Check Firebase rules allow authenticated reads
- Verify user is authenticated
- Check Firebase Admin SDK initialization

### Performance Issues

**Issue:** Slow response times

**Solution:**
- Upgrade to higher Render plan
- Add caching
- Optimize database queries
- Use connection pooling

**Issue:** Rate limiting by exchanges

**Solution:**
- Increase delay between requests
- Use exponential backoff
- Consider upgrading exchange API tier

---

## Monitoring

### Logs

View logs in Render Dashboard:
- Go to your service
- Click "Logs" tab
- Filter by error level

### Health Monitoring

Set up external monitoring:
- Use UptimeRobot or similar
- Monitor `/health` endpoint
- Alert on downtime

### Firebase Monitoring

Monitor Firebase usage:
- Go to Firebase Console
- Check Realtime Database usage
- Monitor read/write operations
- Set up billing alerts

---

## Scaling

### Horizontal Scaling

Render supports auto-scaling:
1. Go to service settings
2. Enable "Auto-Scale"
3. Set min/max instances
4. Configure scale triggers

### Vertical Scaling

Upgrade plan for more resources:
- More RAM
- More CPU
- Better network

### Database Optimization

1. Index frequently queried fields
2. Use Firebase queries efficiently
3. Implement caching layer
4. Archive old data

---

## Security Best Practices

### Environment Variables
- ✅ Never commit secrets to repo
- ✅ Use Render's secret management
- ✅ Rotate keys regularly
- ✅ Use different keys for dev/prod

### API Keys
- ✅ Store encrypted in Firebase
- ✅ Never log sensitive data
- ✅ Use read-only keys when possible
- ✅ Implement key rotation

### Network Security
- ✅ Use HTTPS only (Render provides SSL)
- ✅ Implement rate limiting
- ✅ Use CORS correctly
- ✅ Validate all inputs

### Authentication
- ✅ Use Firebase Auth
- ✅ Implement JWT properly
- ✅ Set token expiration
- ✅ Validate tokens on every request

---

## Backup & Recovery

### Firebase Backup

Set up automatic backups:
1. Go to Firebase Console
2. Firestore → Backups (if using Firestore)
3. For Realtime DB, export periodically
4. Store backups in Cloud Storage

### Code Backup

- ✅ Use Git for version control
- ✅ Tag releases
- ✅ Maintain changelog
- ✅ Test rollback procedure

### Disaster Recovery Plan

1. Document recovery steps
2. Test recovery process
3. Keep backup of environment variables
4. Maintain deployment history

---

## Custom Domain Setup

### Add Custom Domain

1. Go to Render service settings
2. Click "Custom Domains"
3. Add your domain
4. Update DNS records:

```
Type: CNAME
Name: @ (or subdomain)
Value: your-service.onrender.com
```

5. Wait for SSL certificate (auto-provisioned)

### SSL/TLS

Render provides free SSL certificates:
- Auto-renewed
- Let's Encrypt based
- No configuration needed

---

## CI/CD Integration

### Automatic Deployments

Render auto-deploys on push to main branch.

To disable auto-deploy:
1. Go to service settings
2. Uncheck "Auto-Deploy"
3. Manually deploy when ready

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          npm install
          npm test

      - name: Validate environment
        run: |
          cd backend
          pip install -r requirements.txt
          python ../scripts/check_envs.py
```

---

## Cost Optimization

### Render Plans

- **Free:** Good for testing, has limitations
- **Starter ($7/mo):** Production-ready, no sleep
- **Standard ($25/mo):** Better performance
- **Pro ($85/mo):** High traffic

### Firebase Costs

Monitor usage:
- Realtime Database: Pay for bandwidth + storage
- Authentication: Free up to 50k MAU
- Functions: Pay per invocation

**Optimization tips:**
- Use queries efficiently
- Implement caching
- Archive old data
- Use indexes

---

## Support & Resources

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Render Community](https://community.render.com)

### Firebase Documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [Realtime Database Guide](https://firebase.google.com/docs/database)

### Project Documentation
- `IMPLEMENTATION_SUMMARY.md` - Full feature list
- `PRIORITY1_PROGRESS.md` - Implementation details
- `scripts/check_envs.py` - Environment validation

---

## Quick Reference

### Useful Commands

```bash
# View logs
render logs -s your-service-name

# SSH into service
render ssh -s your-service-name

# Restart service
# (Do this from Render Dashboard)

# Run environment check
python scripts/check_envs.py

# Test exchanges
python scripts/test_exchanges.py
```

### Important URLs

- Render Dashboard: https://dashboard.render.com
- Firebase Console: https://console.firebase.google.com
- Your API: https://your-service.onrender.com
- Health Check: https://your-service.onrender.com/health

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code committed to GitHub
- [ ] Environment variables prepared
- [ ] Firebase project configured
- [ ] Build tested locally
- [ ] Environment validation passes

### During Deployment
- [ ] Service created on Render
- [ ] Environment variables added
- [ ] Build command configured
- [ ] Start command configured
- [ ] Deployment initiated

### Post-Deployment
- [ ] Health check passes
- [ ] Can authenticate
- [ ] Exchanges connect
- [ ] Balances load
- [ ] Orders can be placed
- [ ] Auto-trading works
- [ ] Logs show no errors

### Monitoring Setup
- [ ] External monitoring configured
- [ ] Log alerts set up
- [ ] Firebase usage monitored
- [ ] Backup strategy implemented

---

*Ready to deploy? Follow the steps above and your platform will be live on Render in minutes!*

**Need help?** Check the troubleshooting section or review the implementation summary.
