# Quick Setup Guide - Bold.new Trading Platform

## 🎯 Goal
Get your trading platform running locally with Firebase Realtime Database integration and test all 5 exchange connections.

---

## Step 1: Firebase Setup (10 minutes)

### 1.1 Get Your Firebase Credentials

You already have a Firebase project: `onlineaviator-aa5a7`

**Get Service Account JSON:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `onlineaviator-aa5a7`
3. Click ⚙️ (Settings) → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download JSON file (save as `firebase-service-account.json`)

**Enable Realtime Database:**
1. In Firebase Console, go to "Realtime Database"
2. If not enabled, click "Create Database"
3. Choose location (us-central1 recommended)
4. Start in "Test mode" (we'll add security rules later)

---

## Step 2: Environment Configuration (5 minutes)

### 2.1 Create Backend .env File

```bash
cd backend
cp .env.example .env
```

### 2.2 Edit backend/.env with Your Credentials

```bash
# Required Firebase Configuration
FIREBASE_API_KEY=AIzaSyDqAsiITYyPK9bTuGGz7aVBkZ7oLB2Kt3U
FIREBASE_DATABASE_URL=https://onlineaviator-aa5a7-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=onlineaviator-aa5a7

# IMPORTANT: Copy entire content of firebase-service-account.json as SINGLE LINE
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"onlineaviator-aa5a7",...}

# Security (generate new keys for production)
JWT_SECRET_KEY=dev-secret-key-minimum-32-characters-for-testing-only
ENCRYPTION_KEY=dev-encryption-key-32-chars!!

# Server
PORT=8000
NODE_ENV=development
```

**⚠️ IMPORTANT for FIREBASE_CREDENTIALS_JSON:**
```bash
# Remove all newlines from the JSON file:
cat firebase-service-account.json | tr -d '\n' | tr -d ' '

# Then paste the output as the value of FIREBASE_CREDENTIALS_JSON
```

### 2.3 Create Root .env File (Optional, for frontend)

```bash
cd ..  # back to root
cp .env.local.example .env
```

Edit with Firebase web credentials (already configured in `src/lib/firebase.ts`).

---

## Step 3: Install Dependencies (5 minutes)

### 3.1 Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Expected packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `firebase-admin` - Firebase Admin SDK
- `httpx` - HTTP client
- `pyjwt` - JWT authentication

### 3.2 Frontend Dependencies

```bash
cd ..  # back to root
npm install
```

---

## Step 4: Validate Environment (2 minutes)

### 4.1 Run Environment Validation

```bash
python3 scripts/check_envs.py
```

**Expected Output:**
```
✅ PASSED:
  ✅ FIREBASE_API_KEY - Firebase Web API Key
  ✅ FIREBASE_DATABASE_URL - Firebase Realtime Database URL
  ✅ FIREBASE_PROJECT_ID - Firebase Project ID
  ✅ FIREBASE_CREDENTIALS_JSON - Firebase Admin SDK Credentials
  ✅ JWT_SECRET_KEY - JWT Secret for token signing
  ✅ ENCRYPTION_KEY - 32-character encryption key

📊 SUMMARY:
  ✅ Passed: 6
  ⚠️  Warnings: 5
  ❌ Errors: 0

✅ ALL REQUIRED ENVIRONMENT VARIABLES ARE VALID!
```

**If you see errors:**
- Check Firebase credentials are correct
- Ensure FIREBASE_CREDENTIALS_JSON is single line
- Verify JWT_SECRET_KEY is at least 32 characters
- Verify ENCRYPTION_KEY is exactly 32 characters

---

## Step 5: Test Exchange Connections (10 minutes)

### 5.1 Add Test Exchange Credentials

**Option A: Add to backend/.env (temporary, for testing)**
```bash
# Add to backend/.env
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_secret

# Repeat for other exchanges you want to test
```

**Option B: Use script prompts (recommended)**
The test script will prompt for credentials.

### 5.2 Run Exchange Tests

```bash
# Test all configured exchanges
python3 scripts/test_exchanges.py

# Or test specific exchange
python3 scripts/test_exchanges.py binance
```

**Expected Output:**
```
╔══════════════════════════════════════════╗
║   Exchange Integration Test Suite      ║
╚══════════════════════════════════════════╝

━━━ Testing BINANCE ━━━

  🔍 Test 1: Fetching account balance...
    ✅ Balance fetched successfully
       Total: 1000.00 USDT
       Available: 950.00 USDT

  🔍 Test 2: Fetching BTCUSDT price...
    ✅ Price fetched successfully
       BTCUSDT: $43,250.00

  🔍 Test 3: Fetching open positions...
    ✅ Positions fetched successfully
       Open positions: 0

━━━ BINANCE Summary ━━━
✅ All tests passed (3/3)
```

**If tests fail:**
- Check API key permissions (need: Read, Trading for futures)
- Verify API key is not IP-restricted
- Check exchange status (not maintenance)
- Ensure test network/mainnet matches your keys

---

## Step 6: Start Backend Server (5 minutes)

### 6.1 Start Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Will watch for changes in these directories: ['/path/to/backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.

✅ Auth module loaded
✅ Auto-trading module loaded successfully
✅ Exchange services loaded
✅ Balance module loaded
✅ Payments module loaded
✅ Admin module loaded
✅ Integrations module loaded
✅ Transactions module loaded
```

### 6.2 Test Health Endpoint

Open browser or use curl:
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T12:34:56.789Z"
}
```

### 6.3 Test API Documentation

Open browser:
```
http://localhost:8000/docs
```

You should see FastAPI Swagger UI with all endpoints.

---

## Step 7: Test Integration Health Check (5 minutes)

### 7.1 Register Test User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 7.2 Login & Get Token

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

Save the `token` from response.

### 7.3 Add Exchange API Keys

```bash
curl -X POST http://localhost:8000/api/user/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exchange":"binance",
    "api_key":"your_binance_key",
    "api_secret":"your_binance_secret",
    "is_futures":true
  }'
```

### 7.4 Check Integration Health

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/integrations/health
```

**Expected Response:**
```json
{
  "timestamp": "2025-11-06T12:34:56Z",
  "user_id": "abc123",
  "exchanges": [
    {
      "exchange": "binance",
      "connected": true,
      "last_ping": "2025-11-06T12:34:56Z",
      "error": null,
      "response_time_ms": 234
    }
  ],
  "summary": {
    "total": 1,
    "connected": 1,
    "failed": 0
  }
}
```

---

## Step 8: Verify Firebase Data (2 minutes)

### 8.1 Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `onlineaviator-aa5a7`
3. Go to "Realtime Database"
4. You should see data structure:

```
/
├── users/
│   └── {user_id}/
│       └── api_keys/
│           └── binance/
│               ├── api_key: "..."
│               ├── api_secret: "..." (encrypted)
│               ├── status: "active"
│               └── added_at: 1730905200
```

### 8.2 Verify Encryption

API secrets should be encrypted in Firebase. Check that:
- `api_secret` value looks encrypted (not plaintext)
- Original secret is not visible in Firebase Console

---

## Step 9: Start Frontend (Optional, 3 minutes)

### 9.1 Start Development Server

```bash
npm run dev
```

### 9.2 Open Browser

```
http://localhost:5173
```

### 9.3 Test Full Flow

1. Register/Login
2. Go to Settings → Add Exchange
3. Add exchange credentials
4. Check Dashboard → Should show balance
5. Go to Auto Trading → Configure strategy

---

## 🎉 Success Criteria

You should now have:

- ✅ Environment validation passing
- ✅ Exchange tests connecting successfully
- ✅ Backend server running
- ✅ Health endpoint responding
- ✅ Integration health check working
- ✅ Firebase storing user data
- ✅ API keys encrypted in Firebase
- ✅ Frontend connecting to backend (optional)

---

## 🐛 Common Issues & Solutions

### Issue: "Firebase not initialized"

**Cause:** Invalid Firebase credentials

**Solution:**
1. Check `FIREBASE_CREDENTIALS_JSON` is valid JSON
2. Remove all newlines (single line)
3. Verify project_id matches your Firebase project
4. Check private_key has proper formatting

### Issue: "Exchange connection failed"

**Cause:** Invalid API keys or permissions

**Solution:**
1. Verify API key is active on exchange
2. Check API permissions (need Read + Trade for futures)
3. Remove IP restrictions or add your IP
4. Check exchange is not in maintenance

### Issue: "Rate limit exceeded"

**Cause:** Too many requests to exchange

**Solution:**
1. Wait 1 minute before retrying
2. Use exponential backoff (already implemented)
3. Check if running multiple instances
4. Verify unified exchange service is being used

### Issue: "JWT token invalid"

**Cause:** Token expired or wrong secret

**Solution:**
1. Check `JWT_SECRET_KEY` matches between requests
2. Token expires after 7 days - login again
3. Verify token is passed in `Authorization: Bearer` header

---

## 📞 Need Help?

**Documentation:**
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list
- `PRIORITY1_PROGRESS.md` - Implementation details
- `RENDER_DEPLOYMENT_GUIDE.md` - Deployment instructions

**Scripts:**
- `scripts/check_envs.py` - Environment validation
- `scripts/test_exchanges.py` - Exchange connectivity testing

**Logs:**
Check backend terminal for detailed error messages.

---

## 🚀 Next Steps

Once local testing is complete:

1. **Review `RENDER_DEPLOYMENT_GUIDE.md`** for production deployment
2. **Set Firebase security rules** (see IMPLEMENTATION_SUMMARY.md)
3. **Deploy to Render.com** with production credentials
4. **Monitor health endpoints** after deployment
5. **Enable auto-trading** for test users

---

**Ready to test? Start with Step 1!** 🎯
