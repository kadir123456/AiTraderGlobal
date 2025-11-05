# Firebase Realtime Database Structure - Auto Trading

## Database Structure

```json
{
  "users": {
    "USER_ID": {
      "email": "user@example.com",
      "api_keys": {
        "binance": {
          "api_key": "xxx",
          "api_secret": "xxx",
          "is_futures": true,
          "status": "active",
          "added_at": 1234567890
        }
      },
      "auto_trading": {
        "enabled": true,
        "watchlist": ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
        "interval": "15m",
        "default_amount": 10,
        "default_leverage": 10,
        "default_tp": 5,
        "default_sl": 2,
        "exchange": "binance",
        "updated_at": 1234567890
      }
    }
  },
  "signals": {
    "SIGNAL_ID": {
      "user_id": "USER_ID",
      "symbol": "BTCUSDT",
      "signal_type": "bullish",
      "ema9": 45000,
      "ema21": 44500,
      "price": 45100,
      "exchange": "binance",
      "interval": "15m",
      "timestamp": 1234567890,
      "action_taken": true,
      "action_timestamp": 1234567900
    }
  }
}
```

## Security Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "auto_trading": {
          ".validate": "newData.hasChildren(['enabled', 'watchlist', 'interval'])"
        }
      }
    },
    "signals": {
      ".read": "auth != null",
      "$signal_id": {
        ".read": "data.child('user_id').val() === auth.uid",
        ".write": "data.child('user_id').val() === auth.uid"
      },
      ".indexOn": ["user_id", "timestamp"]
    }
  }
}
```

## How Auto Trading Works

### 1. User Configuration
- User enables auto trading in Settings > Otomatik Al-Sat
- Configures watchlist (symbols to monitor)
- Sets trading parameters (amount, leverage, TP/SL)
- Selects exchange and time interval

### 2. EMA Monitor
- Backend EMA Monitor runs continuously for enabled users
- Monitors configured symbols at specified interval
- Calculates EMA 9 and EMA 21 values
- Detects crossover signals:
  - **Bullish**: EMA9 crosses above EMA21 → Open LONG
  - **Bearish**: EMA9 crosses below EMA21 → Open SHORT

### 3. Signal Generation
- When crossover detected, signal is saved to Firebase
- Signal includes all relevant data (symbol, type, EMAs, price)
- Signal is marked with `action_taken: false`

### 4. Auto Position Opening
- If auto trading is enabled, position is opened automatically
- Uses configured default settings (amount, leverage, TP/SL)
- Position is opened on the configured exchange
- Signal is updated with `action_taken: true`

### 5. Position Management
- Opened positions are monitored by EMA Monitor
- Take Profit and Stop Loss are managed automatically
- Position is closed when TP or SL is hit
- Transaction is recorded in Firebase

## API Endpoints

### Get Settings
```
GET /api/auto-trading/settings
Response: AutoTradingSettings object
```

### Update Settings
```
POST /api/auto-trading/settings
Body: AutoTradingSettings object
```

### Get Signal History
```
GET /api/auto-trading/signals/history?limit=50
Response: { signals: Signal[], count: number }
```

### Get Status
```
GET /api/auto-trading/status
Response: { enabled: boolean, active_monitors: number, last_check: string, signals_today: number }
```

## Deployment Steps

1. **Add Firebase Environment Variables to Render:**
   ```
   FIREBASE_CREDENTIALS_JSON=<paste JSON content>
   FIREBASE_DATABASE_URL=https://YOUR-PROJECT.firebaseio.com
   JWT_SECRET_KEY=<your secret key>
   ```

2. **Update Firebase Rules:**
   - Copy the security rules above
   - Go to Firebase Console > Realtime Database > Rules
   - Paste and publish

3. **Deploy Backend:**
   - Render will automatically redeploy
   - Check logs for "✅ Firebase initialized successfully!"

4. **Test Auto Trading:**
   - Login to app
   - Go to Settings > Otomatik Al-Sat
   - Configure settings
   - Enable auto trading
   - Monitor signals in the dashboard

## Notes

- EMA Monitor runs in background for all enabled users
- Signals are checked every minute for configured interval
- Maximum 5 concurrent positions per user (configurable by plan)
- All actions are logged to Firebase for audit trail
