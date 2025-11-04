# Render Deployment Guide

This guide explains how to deploy the EMA Navigator AI platform on Render with separate backend and frontend services.

## Architecture

- **Backend**: FastAPI (Python) - Handles API requests, exchange connections, EMA calculations
- **Frontend**: React + Vite - User interface
- **Database**: Firebase Realtime Database (optional) or PostgreSQL on Render
- **Exchanges**: Binance, Bybit, OKX, KuCoin, MEXC

## Prerequisites

1. GitHub account with your project repository
2. Render account (free tier available)
3. Environment variables ready

## Step 1: Prepare Your Repository

1. Push all code to GitHub:
```bash
git add .
git commit -m "Add backend and deployment config"
git push origin main
```

2. Ensure these files exist:
   - `backend/main.py` - FastAPI application
   - `backend/requirements.txt` - Python dependencies
   - `render.yaml` - Render configuration
   - `Procfile` - Process configuration

## Step 2: Deploy Backend on Render

### Option A: Using render.yaml (Recommended)

1. Go to Render Dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Review services and click "Apply"

### Option B: Manual Setup

1. **Create Web Service**:
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `ema-navigator-backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r backend/requirements.txt`
     - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
     - **Plan**: Free

2. **Environment Variables**:
   Add these in Render dashboard:
   ```
   JWT_SECRET_KEY=<generate-random-32-char-string>
   ENCRYPTION_KEY=<generate-random-32-char-string>
   PYTHON_VERSION=3.11.0
   ```

3. **Health Check**:
   - Path: `/health`
   - This ensures your service is running correctly

4. Click "Create Web Service"

## Step 3: Deploy Frontend on Render

### Option A: Static Site (Recommended)

1. **Create Static Site**:
   - Go to Render Dashboard
   - Click "New" → "Static Site"
   - Connect same GitHub repository
   - Configure:
     - **Name**: `ema-navigator-frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`
     - **Plan**: Free

2. **Environment Variables**:
   ```
   VITE_API_URL=https://ema-navigator-backend.onrender.com
   NODE_VERSION=18.17.0
   ```

3. Click "Create Static Site"

### Option B: Web Service (if you need server-side features)

Follow same steps as backend but use:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run preview`

## Step 4: Configure Environment Variables

### Backend Variables
```env
JWT_SECRET_KEY=your-secret-jwt-key-min-32-characters
ENCRYPTION_KEY=your-encryption-key-exactly-32-chars
FRONTEND_URL=https://your-frontend.onrender.com
PORT=10000
```

### Frontend Variables
```env
VITE_API_URL=https://your-backend.onrender.com
```

## Step 5: Update CORS Settings

In `backend/main.py`, update CORS origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend.onrender.com",
        "http://localhost:8080"  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 6: Test Deployment

1. **Backend Health Check**:
   ```
   https://your-backend.onrender.com/health
   ```
   Should return: `{"status": "healthy"}`

2. **Frontend Access**:
   ```
   https://your-frontend.onrender.com
   ```

3. **API Test**:
   - Register a new user
   - Login
   - Add exchange API key
   - Check EMA signals

## Step 7: Custom Domain (Optional)

### For Frontend:
1. Go to your Static Site settings
2. Click "Custom Domain"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Update DNS records as instructed

### For Backend:
1. Go to your Web Service settings
2. Click "Custom Domain"
3. Add API subdomain (e.g., `api.yourdomain.com`)
4. Update DNS records

## Free Tier Limitations

Render Free tier includes:
- ✅ 750 hours/month of runtime
- ✅ Automatic HTTPS
- ✅ Continuous deployment from Git
- ⚠️ Services spin down after 15 minutes of inactivity
- ⚠️ Cold start delay (30-60 seconds)

**Tip**: For production, upgrade to paid plan ($7/month per service) for:
- No spin-down
- Faster startup
- More resources

## Monitoring

1. **Logs**: View real-time logs in Render Dashboard
2. **Metrics**: Check CPU, memory, and response times
3. **Alerts**: Set up email notifications for failures

## Troubleshooting

### Backend won't start:
- Check build logs for Python errors
- Verify `requirements.txt` is correct
- Ensure `PORT` environment variable is not hardcoded

### Frontend can't connect to backend:
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Test backend health endpoint

### API requests timing out:
- Free tier services spin down after 15 minutes
- First request after spin-down takes 30-60 seconds
- Consider upgrading to paid plan

## Security Best Practices

1. **Use Strong Secrets**:
   ```bash
   # Generate random 32-character string
   openssl rand -hex 32
   ```

2. **Enable HTTPS Only**: Render provides automatic SSL

3. **Restrict CORS**: Only allow your frontend domain

4. **Rate Limiting**: Add rate limiting to API endpoints

5. **API Key Encryption**: All exchange API keys are encrypted before storage

## Scaling

When you're ready to scale:

1. **Upgrade Plan**: Move to paid tier ($7-$85/month)
2. **Add Redis**: For caching and session management
3. **Database**: Add PostgreSQL for better performance
4. **CDN**: Use Render's CDN or Cloudflare
5. **Load Balancer**: Render handles this automatically

## Backup Strategy

1. **Database Backups**: If using PostgreSQL, enable daily backups
2. **Code**: Always in GitHub
3. **Environment Variables**: Keep secure backup of all secrets

## Cost Estimate (After Free Tier)

- Backend Web Service: $7/month
- Frontend Static Site: Free
- PostgreSQL (optional): $7/month
- **Total**: ~$14/month for production-ready setup

## Next Steps

1. ✅ Deploy backend and frontend
2. ✅ Test all API endpoints
3. ✅ Add custom domain
4. ✅ Set up monitoring
5. ✅ Configure payment webhooks
6. ✅ Add analytics

## Support

- Render Docs: https://render.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- Community: Check Render community forum

## Updates and Redeployment

Render automatically redeploys when you push to main branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Both services will rebuild and redeploy automatically.
