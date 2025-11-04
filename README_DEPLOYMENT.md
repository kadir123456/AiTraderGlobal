# Backend + Frontend Deployment Guide

## ⚠️ IMPORTANT: Lovable Platform Limitation

**Lovable only supports frontend (React/Vite) builds.** The backend code in this project (`/backend` folder) is included for your convenience but **will NOT run on Lovable's preview or hosting**.

## How to Use This Project

### Option 1: Local Development (Recommended for Testing)

1. **Clone/Export the project** from Lovable to your local machine
2. **Install dependencies**:
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   pip install -r requirements.txt
   ```

3. **Run backend locally**:
   ```bash
   cd backend
   python main.py
   # Backend runs on http://localhost:8000
   ```

4. **Run frontend locally** (in new terminal):
   ```bash
   npm run dev
   # Frontend runs on http://localhost:8080
   ```

5. **Update API URL**: Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

### Option 2: Deploy to Render (Production)

This project is designed to be deployed as **two separate services** on Render:

#### Step 1: Prepare Your Repository
1. Export project from Lovable to GitHub
2. Push all code to your repository

#### Step 2: Deploy Backend (FastAPI)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `your-app-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free or Starter ($7/mo)

5. Add Environment Variables:
   ```
   JWT_SECRET_KEY=<random-32-char-string>
   ENCRYPTION_KEY=<random-32-char-string>
   PYTHON_VERSION=3.11.0
   ```

6. Click "Create Web Service"
7. **Save your backend URL** (e.g., `https://your-app-backend.onrender.com`)

#### Step 3: Deploy Frontend (React/Vite)
1. In Render Dashboard, click "New +" → "Static Site"
2. Connect same GitHub repository
3. Configure:
   - **Name**: `your-app-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   VITE_API_URL=https://your-app-backend.onrender.com
   NODE_VERSION=18.17.0
   ```

5. Click "Create Static Site"

#### Step 4: Update CORS Settings
In `backend/main.py`, update allowed origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app-frontend.onrender.com",
        "http://localhost:8080"
    ],
    ...
)
```

Commit and push this change to trigger redeployment.

### Option 3: Use Alternative Backend Solutions

If you prefer to stay within Lovable ecosystem:

1. **Firebase Functions** (Free tier available)
   - Already implemented in `functions/` folder
   - Deploy using `firebase deploy --only functions`
   - See `FIREBASE_DEPLOYMENT.md` for instructions

2. **Supabase Edge Functions** (via Lovable Cloud)
   - Enable Lovable Cloud integration
   - Migrate backend logic to Edge Functions
   - Automatic deployment and scaling

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
         ┌───────────────────────┐
         │  Frontend (Vite)      │
         │  Render Static Site   │
         │  or Lovable Hosting   │
         └───────────┬───────────┘
                     │
                     │ API Calls
                     ▼
         ┌───────────────────────┐
         │  Backend (FastAPI)    │
         │  Render Web Service   │
         │  Port: $PORT          │
         └───────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌─────────┐
   │Binance │  │  Bybit  │  │   OKX   │
   │  API   │  │   API   │  │   API   │
   └────────┘  └─────────┘  └─────────┘
```

## Testing

### Test Backend Health
```bash
curl https://your-backend.onrender.com/health
# Should return: {"status": "healthy"}
```

### Test Frontend Connection
1. Open your frontend URL
2. Register/Login
3. Try to add an exchange
4. Check browser console for API calls

## Costs (Render Pricing)

- **Backend (Web Service)**: 
  - Free: $0/month (sleeps after 15 min inactivity)
  - Starter: $7/month (always on)
  
- **Frontend (Static Site)**: Free forever

- **Database**: 
  - Firebase: Free tier (100k reads/day)
  - PostgreSQL on Render: $7/month (if needed)

**Total cost for production**: $7-14/month

## Common Issues

### Backend not responding
- Check if service is "active" in Render dashboard
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds

### CORS errors
- Verify frontend URL is in backend's allowed origins
- Check that `VITE_API_URL` environment variable is correct

### API calls failing
- Ensure backend is deployed and running
- Check backend logs in Render dashboard
- Verify JWT token is being sent in Authorization header

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Render or keep on Lovable
3. ✅ Test all API endpoints
4. ✅ Add custom domain (optional)
5. ✅ Set up monitoring
6. ✅ Configure payment webhooks

## Support

- Render Docs: https://render.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- Project Issues: Check GitHub repository

---

**Remember**: The backend code in `/backend` is provided for deployment outside Lovable. If you want to use Lovable's hosting, consider using Firebase Functions or Lovable Cloud instead.
