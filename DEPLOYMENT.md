# Deployment Guide - Render.com

## Prerequisites
- GitHub repository connected to Render
- Firebase project configured
- Payment provider account (Paddle or LemonSqueezy)

## Step 1: Frontend Deployment (Render Web Service)

1. **Create New Web Service** in Render Dashboard
   - Connect your GitHub repository
   - Choose "Static Site" service type
   - Build Command: `npm run build`
   - Publish Directory: `dist`

2. **Environment Variables** (Add in Render Dashboard)
   ```
   VITE_FIREBASE_API_KEY=your-production-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   
   VITE_TRADING_API_URL=https://your-backend.onrender.com
   
   # Payment (Paddle or LemonSqueezy)
   VITE_PADDLE_VENDOR_ID=your-vendor-id
   VITE_LEMONSQUEEZY_STORE_ID=your-store-id
   
   VITE_APP_ENV=production
   VITE_APP_VERSION=1.0.0
   ```

3. **Deploy Settings**
   - Auto-Deploy: Yes (on main branch)
   - Node Version: 18.x or higher

## Step 2: Backend Deployment (Python Trading API)

1. **Create New Web Service** for Backend
   - Service Type: Web Service
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Backend Environment Variables**
   ```
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   FIREBASE_SERVICE_ACCOUNT_KEY=<your-service-account-json>
   
   # Exchange API Keys (Encrypted in Firebase)
   ENCRYPTION_KEY=your-32-byte-encryption-key
   
   # EMA Strategy Settings
   EMA_SHORT_PERIOD=9
   EMA_LONG_PERIOD=21
   MIN_TIMEFRAME=15m
   ```

## Step 3: Firebase Security Rules

Update Firebase Realtime Database Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "trades": {
          ".indexOn": ["timestamp", "status"]
        },
        "positions": {
          ".indexOn": ["symbol", "status"]
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

## Step 4: Payment Integration

### Option A: Paddle
1. Create products in Paddle Dashboard
2. Set webhook URL: `https://your-frontend.onrender.com/api/paddle/webhook`
3. Configure product IDs in environment variables

### Option B: LemonSqueezy
1. Create products in LemonSqueezy
2. Set webhook URL: `https://your-frontend.onrender.com/api/lemonsqueezy/webhook`
3. Configure variant IDs in environment variables

## Step 5: Domain Configuration

1. **Custom Domain** (Optional)
   - Add custom domain in Render Dashboard
   - Update DNS records (CNAME or A record)
   - Enable HTTPS (automatic with Render)

2. **CORS Configuration**
   - Add your domain to Firebase authorized domains
   - Update backend CORS settings to allow your frontend domain

## Step 6: Post-Deployment Checklist

- [ ] Test authentication flow (signup, login, logout)
- [ ] Verify Firebase data read/write
- [ ] Test language switching (EN/TR)
- [ ] Verify payment flow (test mode first)
- [ ] Check all API endpoints
- [ ] Test WebSocket connections (if implemented)
- [ ] Monitor error logs in Render Dashboard
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy for Firebase

## Monitoring & Maintenance

- **Render Dashboard**: Monitor service health, logs, and metrics
- **Firebase Console**: Track database usage, authentication stats
- **Payment Provider**: Monitor subscriptions and revenue
- **Error Tracking**: Consider integrating Sentry or similar

## Rollback Strategy

If deployment fails:
1. Render allows instant rollback to previous deployment
2. Keep Firebase rules versioned
3. Maintain database backups

## Performance Optimization

- Enable Render CDN for static assets
- Optimize bundle size with code splitting
- Use Firebase caching strategies
- Implement proper loading states
- Add service worker for PWA capabilities

## Security Best Practices

- ✅ Never commit .env files
- ✅ Use Firebase security rules
- ✅ Encrypt API keys in database
- ✅ Implement rate limiting
- ✅ Enable HTTPS only
- ✅ Regular dependency updates
- ✅ Monitor for security alerts
