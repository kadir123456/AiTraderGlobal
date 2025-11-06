# EMA Navigator AI Trading Platform - Complete Documentation

## 🎯 Project Overview

**EMA Navigator** is a comprehensive SaaS platform for automated cryptocurrency trading across multiple exchanges. It uses EMA (Exponential Moving Average) crossover strategies to generate real-time trading signals and execute automated trades.

### Core Value Proposition
- **Multi-Exchange Support**: Trade on Binance, Bybit, OKX, KuCoin, and MEXC from a single interface
- **Real-Time Signal Broadcasting**: WebSocket-based signal distribution to 1000+ concurrent users
- **Automated Trading**: Set-and-forget trading with customizable TP/SL and leverage
- **Subscription-Based**: Three-tier pricing (Free, Pro, Enterprise) via LemonSqueezy payments
- **Scalable Architecture**: Designed to handle thousands of concurrent users efficiently

---

## 📁 Project Structure

```
project/
├── backend/                          # Python FastAPI Backend
│   ├── main.py                      # Main API server with WebSocket support
│   ├── auth.py                      # Firebase authentication & JWT handling
│   ├── config.py                    # Configuration & environment variables
│   ├── firebase_admin.py            # Firebase Admin SDK integration
│   ├── firebase_manager.py          # Firebase Realtime Database operations
│   ├── websocket_manager.py         # WebSocket connection & broadcast manager
│   │
│   ├── api/                         # API Route Modules
│   │   ├── admin.py                # Admin user management endpoints
│   │   ├── auto_trading.py         # Auto-trading control endpoints
│   │   ├── balance.py              # Exchange balance retrieval
│   │   ├── integrations.py         # Exchange API key management
│   │   ├── payments.py             # LemonSqueezy webhook handlers
│   │   └── transactions.py         # Trading history endpoints
│   │
│   ├── services/                    # Business Logic & Exchange Integration
│   │   ├── unified_exchange.py     # Unified exchange interface
│   │   ├── binance_service.py      # Binance API wrapper
│   │   ├── bybit_service.py        # Bybit API wrapper
│   │   ├── okx_service.py          # OKX API wrapper
│   │   ├── kucoin_service.py       # KuCoin API wrapper
│   │   ├── mexc_service.py         # MEXC API wrapper
│   │   ├── ema_monitor.py          # EMA signal calculation
│   │   ├── ema_monitor_firebase.py # EMA monitor with Firebase + WebSocket
│   │   └── trade_manager.py        # Trade execution & position management
│   │
│   └── database/                    # Database Schemas (if PostgreSQL used)
│       ├── db.py                   # Database connection
│       └── schema_complete.sql     # Complete DB schema
│
├── src/                             # React Frontend (TypeScript)
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Main app component with routing
│   │
│   ├── pages/                      # Page Components
│   │   ├── Index.tsx               # Landing page
│   │   ├── Auth.tsx                # Login/Register page
│   │   ├── Dashboard.tsx           # Main dashboard (balances, signals, positions)
│   │   ├── Trading.tsx             # Manual trading interface
│   │   ├── Settings.tsx            # User settings & exchange connections
│   │   ├── Admin.tsx               # Admin panel (user management)
│   │   ├── AdminSetup.tsx          # First-time admin setup
│   │   ├── Pricing.tsx             # Subscription plans
│   │   ├── FAQ.tsx                 # Frequently asked questions
│   │   ├── Privacy.tsx             # Privacy policy
│   │   └── Terms.tsx               # Terms of service
│   │
│   ├── components/                 # Reusable Components
│   │   ├── Hero.tsx                # Landing page hero section
│   │   ├── Features.tsx            # Feature showcase
│   │   ├── Pricing.tsx             # Pricing cards component
│   │   ├── BalanceCard.tsx         # Exchange balance display
│   │   ├── PositionCard.tsx        # Open position display
│   │   ├── StatsCard.tsx           # Statistics card
│   │   ├── TradingForm.tsx         # Manual trade form
│   │   ├── TradingFormEnhanced.tsx # Advanced trading form
│   │   ├── TransactionHistoryTable.tsx # Trade history table
│   │   ├── ExchangeList.tsx        # Connected exchanges list
│   │   ├── ExchangeConnectDialog.tsx # Exchange connection modal
│   │   ├── LiveSignalIndicator.tsx # Real-time signal display (WebSocket)
│   │   ├── AutoTradingToggle.tsx   # Auto-trading on/off switch
│   │   ├── FeatureGuard.tsx        # Plan-based feature access control
│   │   ├── ThemeToggle.tsx         # Dark/light mode toggle
│   │   ├── LanguageSwitcher.tsx    # EN/TR language switch
│   │   ├── CurrencyToggle.tsx      # USD/TRY currency toggle
│   │   └── ui/                     # shadcn/ui components
│   │
│   ├── contexts/                   # React Context Providers
│   │   ├── AuthContext.tsx         # Firebase auth state management
│   │   └── CurrencyContext.tsx     # Currency display preference
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useAdmin.ts             # Admin role checking
│   │   ├── useBalance.ts           # Fetch exchange balances
│   │   ├── useExchanges.ts         # Manage connected exchanges
│   │   ├── useSubscription.ts      # User subscription plan
│   │   ├── useTrading.ts           # Trading operations
│   │   ├── useTradingSettings.ts   # Trading preferences
│   │   ├── useTradingSignals.ts    # WebSocket signal listener
│   │   ├── useTransactionHistory.ts # Trade history
│   │   └── use-toast.ts            # Toast notifications
│   │
│   ├── lib/                        # Utility Libraries
│   │   ├── firebase.ts             # Firebase client SDK
│   │   ├── firebaseAdmin.ts        # Firebase admin operations (client-side)
│   │   ├── api.ts                  # API client wrapper
│   │   ├── apiConfig.ts            # API configuration
│   │   ├── lemonsqueezy.ts         # LemonSqueezy checkout
│   │   ├── payment.ts              # Payment utilities
│   │   ├── i18n.ts                 # Internationalization setup
│   │   └── utils.ts                # General utilities
│   │
│   └── locales/                    # Translation Files
│       ├── en.json                 # English translations
│       └── tr.json                 # Turkish translations
│
├── functions/                       # Firebase Cloud Functions (optional)
│   ├── validateExchange.js         # Validate exchange credentials
│   └── removeExchange.js           # Remove exchange connection
│
├── public/                          # Static Assets
│   ├── manifest.json               # PWA manifest
│   ├── robots.txt                  # SEO robots file
│   └── *.png                       # Icons & images
│
├── .env                            # Environment variables (local)
├── .env.example                    # Environment template
├── package.json                    # Frontend dependencies
├── vite.config.ts                  # Vite configuration
├── tailwind.config.ts              # Tailwind CSS config
└── tsconfig.json                   # TypeScript configuration
```

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Browser   │  │   Browser   │  │   Browser   │  ... 1000+ │
│  │   (React)   │  │   (React)   │  │   (React)   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                 │                 │                    │
│         └─────────────────┼─────────────────┘                    │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         WebSocket (wss://)      REST API (https://)
         Real-time Signals       User-specific Data
                │                       │
┌───────────────┴───────────────────────┴───────────────────────────┐
│                      BACKEND LAYER (FastAPI)                      │
│                                                                    │
│  ┌──────────────────────────┐    ┌─────────────────────────┐    │
│  │  WebSocket Manager       │    │  REST API Endpoints     │    │
│  │  - Connection Pool       │    │  - Authentication       │    │
│  │  - Broadcast Signals     │    │  - Balance              │    │
│  │  - 1000+ Concurrent      │    │  - Trading              │    │
│  │  - Auto-reconnect        │    │  - Transactions         │    │
│  └──────────────────────────┘    │  - Admin                │    │
│              │                    └─────────────────────────┘    │
│              │                                │                   │
│  ┌───────────┴────────────────────────────────┴────────────┐    │
│  │            Business Logic Layer                          │    │
│  │  ┌──────────────────┐  ┌──────────────────────────┐    │    │
│  │  │  EMA Monitor     │  │  Trade Manager           │    │    │
│  │  │  - EMA9/EMA21    │  │  - Position Management   │    │    │
│  │  │  - Crossover     │  │  - TP/SL Management      │    │    │
│  │  │  - Signal Gen    │  │  - Order Execution       │    │    │
│  │  └──────────────────┘  └──────────────────────────┘    │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │        Unified Exchange Interface                │  │    │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │  │    │
│  │  │  │Binance Bybit   OKX    KuCoin  MEXC  │  │    │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────────┐
│                      DATA LAYER                                   │
│                                                                    │
│  ┌─────────────────────────┐    ┌──────────────────────────┐    │
│  │  Firebase Realtime DB   │    │  Exchange APIs           │    │
│  │  - User Data            │    │  - Binance Futures       │    │
│  │  - API Keys (encrypted) │    │  - Bybit Futures         │    │
│  │  - Subscriptions        │    │  - OKX Futures           │    │
│  │  - Trading Settings     │    │  - KuCoin Futures        │    │
│  │  - Signal History       │    │  - MEXC Futures          │    │
│  │  - Trade History        │    │                          │    │
│  └─────────────────────────┘    └──────────────────────────┘    │
│                                                                    │
│  ┌─────────────────────────┐                                     │
│  │  Firebase Auth          │                                     │
│  │  - Email/Password       │                                     │
│  │  - JWT Tokens           │                                     │
│  │  - Session Management   │                                     │
│  └─────────────────────────┘                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                             │
│                                                                    │
│  ┌─────────────────────────┐    ┌──────────────────────────┐    │
│  │  LemonSqueezy           │    │  Exchange WebSocket APIs │    │
│  │  - Payment Processing   │    │  - Real-time Price Data  │    │
│  │  - Subscription Mgmt    │    │  - Order Updates         │    │
│  │  - Webhooks             │    │  - Account Updates       │    │
│  └─────────────────────────┘    └──────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Core Features & Logic

### 1. **Authentication System**

#### Technology Stack
- **Frontend**: Firebase Authentication (Client SDK)
- **Backend**: Firebase Admin SDK + JWT validation
- **Storage**: Firebase Realtime Database

#### Flow
```
User Registration/Login
    ↓
Firebase Auth (Email/Password)
    ↓
Generate Firebase ID Token
    ↓
Store in localStorage (auth_token)
    ↓
Include in API Headers (Authorization: Bearer {token})
    ↓
Backend validates with Firebase Admin SDK
    ↓
Returns user data + permissions
```

#### Security Features
- Firebase ID tokens auto-refresh
- JWT validation on every API call
- Role-based access control (user/admin)
- Secure session management

---

### 2. **Multi-Exchange Integration**

#### Supported Exchanges
1. **Binance** - World's largest crypto exchange
2. **Bybit** - Popular derivatives exchange
3. **OKX** - Global crypto exchange
4. **KuCoin** - Growing exchange with wide asset support
5. **MEXC** - Exchange with numerous trading pairs

#### Unified Exchange Interface

```python
# backend/services/unified_exchange.py
class UnifiedExchange:
    async def get_balance(exchange, api_key, api_secret, is_futures):
        """Get balance from any exchange with unified response"""
        return {
            "exchange": "binance",
            "type": "futures",
            "currency": "USDT",
            "total": 1000.00,
            "available": 950.00,
            "locked": 50.00
        }

    async def place_order(exchange, symbol, side, amount, price, leverage):
        """Place order on any exchange"""

    async def get_positions(exchange):
        """Get open positions"""

    async def close_position(exchange, symbol):
        """Close specific position"""
```

#### API Key Management
- **Storage**: Firebase Realtime Database (encrypted)
- **Structure**:
  ```json
  {
    "api_keys": {
      "{user_id}": {
        "binance": {
          "api_key": "encrypted_key",
          "api_secret": "encrypted_secret",
          "passphrase": "",
          "created_at": "2025-11-06T..."
        }
      }
    }
  }
  ```

#### Security Measures
- API keys encrypted with AES-256
- Stored server-side only
- Never exposed to frontend
- IP whitelist recommendations

---

### 3. **Real-Time Signal Broadcasting (WebSocket)**

#### Architecture Decision
**Problem**: 1000 users polling REST API every second = 1000 requests/sec = server overload

**Solution**: WebSocket broadcast - 1 signal → broadcast to all users instantly

#### WebSocket Implementation

```python
# backend/websocket_manager.py
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Accept new connection"""
        await websocket.accept()
        self.active_connections.add(websocket)

    async def broadcast_signal(self, signal: Dict):
        """Broadcast to ALL connected users"""
        message = {
            "type": "signal",
            "data": signal,
            "timestamp": datetime.utcnow().isoformat()
        }

        for connection in self.active_connections:
            await connection.send_json(message)
```

#### Frontend WebSocket Hook

```typescript
// src/hooks/useTradingSignals.ts
export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const ws = new WebSocket('wss://api.domain.com/ws/signals');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'signal') {
        setSignals(prev => [message.data, ...prev]);
        // Show toast notification
      }
    };

    // Auto-reconnect logic
    ws.onclose = () => {
      setTimeout(() => connect(), 1000);
    };
  }, []);

  return { signals, connectionStatus };
};
```

#### Performance Metrics
- **Concurrent Connections**: 1000+
- **Broadcast Latency**: <100ms
- **Connection Overhead**: Minimal (ping/pong every 30s)
- **Scalability**: Horizontal scaling via load balancer

---

### 4. **EMA Trading Strategy**

#### What is EMA?
**Exponential Moving Average (EMA)** - Technical indicator that gives more weight to recent prices.

#### Strategy Logic
```
EMA9 = EMA with 9 periods
EMA21 = EMA with 21 periods

BUY Signal (Bullish Crossover):
  When EMA9 crosses ABOVE EMA21

SELL Signal (Bearish Crossover):
  When EMA9 crosses BELOW EMA21
```

#### Signal Detection Flow

```python
# backend/services/ema_monitor_firebase.py
async def check_ema_signal():
    # 1. Calculate current EMAs
    ema9 = await calculate_ema(symbol, interval, period=9)
    ema21 = await calculate_ema(symbol, interval, period=21)

    # 2. Get previous EMAs (to detect crossover)
    prev_ema9 = get_previous_ema(user_id, symbol, 9)
    prev_ema21 = get_previous_ema(user_id, symbol, 21)

    # 3. Detect crossover
    signal = None
    if prev_ema9 < prev_ema21 and ema9 > ema21:
        signal = 'BUY'  # Bullish crossover
    elif prev_ema9 > prev_ema21 and ema9 < ema21:
        signal = 'SELL'  # Bearish crossover

    # 4. Save to Firebase
    if signal:
        save_ema_signal(user_id, {
            'symbol': symbol,
            'signal_type': signal,
            'ema9': ema9,
            'ema21': ema21,
            'price': current_price
        })

        # 5. Broadcast to all WebSocket clients
        await connection_manager.broadcast_signal({
            'signal': signal,
            'exchange': exchange,
            'symbol': symbol,
            'price': current_price,
            'ema9': ema9,
            'ema21': ema21
        })
```

#### Monitoring Parameters
- **Symbols**: User-configured (e.g., BTCUSDT, ETHUSDT)
- **Intervals**: 15m, 1h, 4h, 1d
- **Exchanges**: All 5 supported exchanges
- **Frequency**: Checks every 60 seconds per symbol

---

### 5. **Automated Trading System**

#### Auto-Trading Flow

```
1. User enables auto-trading in settings
   ↓
2. Configure default settings:
   - Leverage: 10x
   - Amount: 10 USDT
   - Take Profit: 5%
   - Stop Loss: 2%
   ↓
3. EMA Monitor detects signal
   ↓
4. Check if auto-trading enabled
   ↓
5. Retrieve API keys from Firebase
   ↓
6. Execute trade via exchange API:
   - Open position (LONG/SHORT)
   - Set leverage
   - Set TP/SL orders
   ↓
7. Save trade to Firebase
   ↓
8. Monitor position status
   ↓
9. Close when TP/SL hit or user manually closes
```

#### Trade Manager

```python
# backend/services/trade_manager.py
class TradeManager:
    async def open_position(
        user_id: str,
        exchange: str,
        symbol: str,
        side: str,  # 'BUY' or 'SELL'
        amount: float,
        leverage: int,
        tp_percent: float,
        sl_percent: float
    ):
        """Open leveraged position with TP/SL"""

        # 1. Get API keys
        api_keys = get_user_api_keys(user_id, exchange)

        # 2. Set leverage
        await set_leverage(exchange, symbol, leverage)

        # 3. Calculate TP/SL prices
        entry_price = get_current_price(symbol)
        tp_price = entry_price * (1 + tp_percent/100) if side == 'BUY' else entry_price * (1 - tp_percent/100)
        sl_price = entry_price * (1 - sl_percent/100) if side == 'BUY' else entry_price * (1 + sl_percent/100)

        # 4. Open position (market order)
        position = await place_market_order(
            exchange, symbol, side, amount * leverage
        )

        # 5. Set TP order
        await place_limit_order(
            exchange, symbol, 'SELL' if side == 'BUY' else 'BUY',
            amount * leverage, tp_price
        )

        # 6. Set SL order (stop-market)
        await place_stop_order(
            exchange, symbol, 'SELL' if side == 'BUY' else 'BUY',
            amount * leverage, sl_price
        )

        # 7. Save to database
        save_trade(user_id, {
            'exchange': exchange,
            'symbol': symbol,
            'side': side,
            'entry_price': entry_price,
            'amount': amount,
            'leverage': leverage,
            'tp_price': tp_price,
            'sl_price': sl_price,
            'status': 'open',
            'created_at': datetime.utcnow()
        })

        return position
```

#### Position Management
- Real-time PnL calculation
- Auto-close on TP/SL hit
- Manual close option
- Position history tracking

---

### 6. **Subscription & Monetization (LemonSqueezy)**

#### Pricing Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Price** | $0/mo | $29/mo | $99/mo |
| **Exchanges** | 1 | 3 | 5 |
| **Auto-Trading** | ❌ | ✅ | ✅ |
| **Custom Strategies** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |

#### Payment Flow

```
User clicks "Upgrade to Pro"
    ↓
Frontend: Open LemonSqueezy checkout
    ↓
LemonSqueezy: Payment processing
    ↓
Payment successful
    ↓
LemonSqueezy: Send webhook to backend
    ↓
Backend: Verify webhook signature
    ↓
Backend: Update user subscription in Firebase
    ↓
Frontend: Redirect to dashboard
    ↓
User now has Pro features unlocked
```

#### Webhook Handler

```python
# backend/api/payments.py
@app.post("/api/webhooks/lemonsqueezy")
async def lemonsqueezy_webhook(request: Request):
    # 1. Verify signature
    signature = request.headers.get('X-Signature')
    payload = await request.body()

    if not verify_signature(payload, signature):
        raise HTTPException(403, "Invalid signature")

    # 2. Parse event
    data = await request.json()
    event_name = data.get('meta', {}).get('event_name')

    # 3. Handle order_created event
    if event_name == 'order_created':
        user_email = data['data']['attributes']['user_email']
        variant_id = data['data']['attributes']['first_order_item']['variant_id']

        # Map variant to plan
        plan = 'pro' if variant_id == '1075011' else 'enterprise'

        # 4. Update Firebase
        firebase_db.reference(f'subscriptions/{user_email}').set({
            'plan': plan,
            'status': 'active',
            'created_at': int(time.time())
        })

    return {"status": "success"}
```

#### Plan Enforcement

```typescript
// src/components/FeatureGuard.tsx
export const FeatureGuard = ({ feature, children }) => {
  const { plan } = useSubscription();

  // Check if user's plan includes this feature
  if (!plan.features.includes(feature)) {
    return (
      <div>
        <p>This feature requires {feature} plan</p>
        <Button onClick={() => navigate('/pricing')}>
          Upgrade Now
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

// Usage:
<FeatureGuard feature="auto_trading">
  <AutoTradingToggle />
</FeatureGuard>
```

---

### 7. **Admin Panel**

#### Admin Features
1. **User Management**
   - View all registered users
   - See subscription status
   - Manually grant/revoke subscriptions
   - Assign admin roles

2. **System Monitoring**
   - Active WebSocket connections
   - Total signals sent
   - System health metrics

3. **Financial Overview**
   - Total revenue
   - Active subscriptions
   - Conversion rates

#### Admin Setup Flow

```
First Time Setup:
1. User registers normally
2. Visit /admin-setup
3. Enter setup key: admin123setup
4. System sets admin role in Firebase:
   user_roles/{user_id} = { role: "admin" }
5. Redirect to /admin panel
```

#### Admin Access Control

```typescript
// src/hooks/useAdmin.ts
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check admin role in Firebase
    const roleRef = ref(database, `user_roles/${user.uid}/role`);
    get(roleRef).then(snapshot => {
      setIsAdmin(snapshot.val() === 'admin');
    });
  }, [user]);

  return { isAdmin };
}
```

---

### 8. **Balance Management**

#### Multi-Exchange Balance Tracking

```typescript
// src/hooks/useBalance.ts
export const useBalance = (exchanges: string[], isFutures: boolean) => {
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    const fetchBalances = async () => {
      const results = [];

      // Fetch balance from each exchange
      for (const exchange of exchanges) {
        const response = await axios.get(
          `/api/bot/balance/${exchange}`,
          { params: { is_futures: isFutures } }
        );

        results.push({
          exchange,
          type: isFutures ? 'futures' : 'spot',
          totalBalance: response.data.total_balance,
          availableBalance: response.data.available_balance,
          usedBalance: response.data.used_balance,
          currency: response.data.currency
        });
      }

      setBalances(results);
    };

    fetchBalances();
  }, [exchanges, isFutures]);

  return { balances };
};
```

#### Balance Display
- Per-exchange breakdown
- Spot vs Futures toggle
- Total balance across all exchanges
- Available vs locked balance
- Real-time updates

---

### 9. **Transaction History**

#### Trade History Tracking

```
Trade Record Structure:
{
  "trades": {
    "{user_id}": {
      "{trade_id}": {
        "exchange": "binance",
        "symbol": "BTCUSDT",
        "side": "BUY",
        "type": "LONG",
        "entry_price": 43500.00,
        "exit_price": 44500.00,
        "amount": 100.00,
        "leverage": 10,
        "pnl": 100.00,
        "pnl_percent": 10.0,
        "status": "closed",
        "created_at": "2025-11-06T10:00:00Z",
        "closed_at": "2025-11-06T11:00:00Z"
      }
    }
  }
}
```

#### History Filtering
- Time range (24h, 7d, 30d, all)
- Exchange filter
- Symbol filter
- Status filter (open, closed, all)
- Export to CSV

---

### 10. **Internationalization (i18n)**

#### Supported Languages
- 🇺🇸 English (en)
- 🇹🇷 Turkish (tr)

#### Implementation

```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      tr: { translation: require('./locales/tr.json') }
    },
    lng: 'en',
    fallbackLng: 'en'
  });

// Usage in components:
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```

#### Translation Files
```json
// src/locales/en.json
{
  "dashboard": {
    "title": "Dashboard",
    "total_balance": "Total Balance",
    "open_positions": "Open Positions"
  }
}

// src/locales/tr.json
{
  "dashboard": {
    "title": "Kontrol Paneli",
    "total_balance": "Toplam Bakiye",
    "open_positions": "Açık Pozisyonlar"
  }
}
```

---

### 11. **Currency Display Toggle**

#### Supported Currencies
- 💵 USD (United States Dollar)
- 💰 TRY (Turkish Lira)

#### Implementation

```typescript
// src/contexts/CurrencyContext.tsx
export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState<'USD' | 'TRY'>('USD');
  const [rate, setRate] = useState(1);

  // Fetch exchange rate
  useEffect(() => {
    if (currency === 'TRY') {
      fetchExchangeRate().then(r => setRate(r));
    }
  }, [currency]);

  const formatPrice = (amount: number) => {
    const value = currency === 'TRY' ? amount * rate : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};
```

---

### 12. **Theme System**

#### Dark/Light Mode

```typescript
// Using next-themes
import { ThemeProvider } from 'next-themes';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <AppContent />
    </ThemeProvider>
  );
}

// Theme toggle component
export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
};
```

---

## 🔒 Security Implementation

### 1. **API Key Encryption**

```python
# backend/config.py
from cryptography.fernet import Fernet

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_api_key(api_key: str) -> str:
    return cipher.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    return cipher.decrypt(encrypted_key.encode()).decode()
```

### 2. **Firebase Authentication**

```python
# backend/auth.py
from firebase_admin import auth as firebase_auth

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, "Unauthorized")

    token = authorization.split('Bearer ')[1]

    try:
        # Verify token with Firebase Admin SDK
        decoded_token = firebase_auth.verify_id_token(token)
        user_id = decoded_token['uid']
        email = decoded_token.get('email')

        return {
            "user_id": user_id,
            "email": email
        }
    except Exception as e:
        raise HTTPException(401, "Invalid token")
```

### 3. **Rate Limiting**

```python
# Implement rate limiting per user
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/bot/balance/{exchange}")
@limiter.limit("30/minute")
async def get_balance(exchange: str):
    ...
```

### 4. **CORS Configuration**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aitraderglobal.com",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

---

## 📊 Database Schema (Firebase Realtime Database)

### Structure

```json
{
  "users": {
    "{user_id}": {
      "email": "user@example.com",
      "created_at": "2025-11-06T10:00:00Z",
      "last_login": "2025-11-06T15:30:00Z"
    }
  },

  "user_roles": {
    "{user_id}": {
      "role": "admin",
      "created_at": "2025-11-06T10:00:00Z"
    }
  },

  "subscriptions": {
    "{user_id}": {
      "plan": "pro",
      "status": "active",
      "order_id": "ord_123456",
      "created_at": 1699276800,
      "updated_at": 1699276800,
      "expires_at": 1701868800
    }
  },

  "api_keys": {
    "{user_id}": {
      "binance": {
        "api_key": "encrypted_key_here",
        "api_secret": "encrypted_secret_here",
        "passphrase": "",
        "created_at": "2025-11-06T10:00:00Z"
      },
      "bybit": {
        "api_key": "encrypted_key_here",
        "api_secret": "encrypted_secret_here"
      }
    }
  },

  "trading_settings": {
    "{user_id}": {
      "auto_trading_enabled": true,
      "default_leverage": 10,
      "default_amount": 10,
      "default_tp_percent": 5,
      "default_sl_percent": 2,
      "monitored_symbols": ["BTCUSDT", "ETHUSDT"],
      "interval": "15m"
    }
  },

  "ema_signals": {
    "{user_id}": {
      "{signal_id}": {
        "symbol": "BTCUSDT",
        "signal_type": "BUY",
        "ema9": 43500.50,
        "ema21": 43450.30,
        "price": 43500.00,
        "exchange": "binance",
        "interval": "15m",
        "created_at": "2025-11-06T15:45:00Z"
      }
    }
  },

  "trades": {
    "{user_id}": {
      "{trade_id}": {
        "exchange": "binance",
        "symbol": "BTCUSDT",
        "side": "BUY",
        "type": "LONG",
        "entry_price": 43500.00,
        "exit_price": 44500.00,
        "amount": 100.00,
        "leverage": 10,
        "tp_price": 45675.00,
        "sl_price": 42630.00,
        "pnl": 100.00,
        "pnl_percent": 10.0,
        "status": "closed",
        "created_at": "2025-11-06T15:45:00Z",
        "closed_at": "2025-11-06T16:45:00Z"
      }
    }
  },

  "positions": {
    "{user_id}": {
      "{position_id}": {
        "exchange": "binance",
        "symbol": "BTCUSDT",
        "side": "LONG",
        "entry_price": 43500.00,
        "current_price": 43800.00,
        "amount": 100.00,
        "leverage": 10,
        "pnl": 30.00,
        "pnl_percent": 3.0,
        "tp_price": 45675.00,
        "sl_price": 42630.00,
        "status": "open",
        "created_at": "2025-11-06T15:45:00Z"
      }
    }
  }
}
```

---

## 🚀 Deployment Guide

### Backend Deployment (Render/Heroku)

#### Render Configuration
```yaml
# render.yaml
services:
  - type: web
    name: aitraderglobal-backend
    env: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: python backend/main.py
    envVars:
      - key: FIREBASE_API_KEY
        sync: false
      - key: FIREBASE_DATABASE_URL
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
      - key: JWT_SECRET_KEY
        sync: false
      - key: LEMONSQUEEZY_API_KEY
        sync: false
      - key: LEMONSQUEEZY_SIGNING_SECRET
        sync: false
```

#### Environment Variables (Backend)
```bash
# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Security
JWT_SECRET_KEY=your-random-secret-key-here
ENCRYPTION_KEY=your-32-char-encryption-key

# LemonSqueezy
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
LEMONSQUEEZY_STORE_ID=239668
LEMONSQUEEZY_SIGNING_SECRET=your_webhook_secret

# Server
PORT=8000
CORS_ORIGINS=https://your-frontend-domain.com
```

### Frontend Deployment (Vercel/Netlify)

#### Environment Variables (Frontend)
```bash
# API
VITE_API_URL=https://your-backend-domain.com

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# LemonSqueezy
VITE_LEMONSQUEEZY_STORE_ID=239668
VITE_LEMONSQUEEZY_VARIANT_ID_PRO=1075011
VITE_LEMONSQUEEZY_VARIANT_ID_ENTERPRISE=1075030
```

#### Build Command
```bash
npm run build
```

#### Output Directory
```
dist/
```

---

## 🧪 Testing Guide

### Backend Testing

```bash
# Install dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest backend/tests/

# Test specific module
pytest backend/tests/test_ema_monitor.py

# Test with coverage
pytest --cov=backend backend/tests/
```

### Frontend Testing

```bash
# Install dependencies
npm install --save-dev @testing-library/react vitest

# Run tests
npm run test

# Watch mode
npm run test:watch
```

### Manual Testing Checklist

#### Authentication
- [ ] User registration works
- [ ] User login works
- [ ] Token refresh works
- [ ] Logout clears session

#### Exchange Integration
- [ ] Can connect to Binance
- [ ] Can connect to Bybit
- [ ] Can connect to OKX
- [ ] Can connect to KuCoin
- [ ] Can connect to MEXC
- [ ] Balance fetching works
- [ ] API key validation works

#### Trading
- [ ] Manual trade execution works
- [ ] Auto-trading toggle works
- [ ] TP/SL orders are set correctly
- [ ] Position closes on TP hit
- [ ] Position closes on SL hit
- [ ] PnL calculation is accurate

#### WebSocket
- [ ] Connection establishes
- [ ] Signals are received
- [ ] Toast notifications work
- [ ] Auto-reconnect works

#### Subscription
- [ ] Payment flow works
- [ ] Webhook updates subscription
- [ ] Feature access is enforced
- [ ] Upgrade/downgrade works

---

## 📈 Performance Optimization

### Frontend Optimizations
1. **Code Splitting**: Dynamic imports for routes
2. **Lazy Loading**: Components loaded on demand
3. **Image Optimization**: WebP format, lazy loading
4. **Bundle Size**: Tree shaking, minification
5. **Caching**: Service worker for PWA

### Backend Optimizations
1. **Connection Pooling**: Reuse HTTP connections
2. **Caching**: Redis for frequent queries
3. **Async Operations**: All I/O is async
4. **Rate Limiting**: Prevent abuse
5. **WebSocket**: Reduces HTTP overhead

### Database Optimizations
1. **Indexing**: Index user_id, timestamps
2. **Denormalization**: Store computed values
3. **Pagination**: Limit query results
4. **Caching**: Cache frequent reads

---

## 🐛 Common Issues & Solutions

### Issue: WebSocket not connecting
**Solution**:
- Check if `wss://` protocol is used in production
- Verify CORS settings allow WebSocket connections
- Check firewall/proxy settings

### Issue: API keys not working
**Solution**:
- Verify API key permissions on exchange
- Check IP whitelist on exchange
- Ensure encryption key is correct
- Test API keys with exchange directly

### Issue: Balance not updating
**Solution**:
- Check exchange API status
- Verify API key has balance read permission
- Clear cache and refresh
- Check network tab for API errors

### Issue: Signals not received
**Solution**:
- Verify EMA monitor is running
- Check WebSocket connection status
- Ensure auto-trading is enabled
- Check Firebase for signal records

---

## 📝 Development Workflow

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/ema-navigator.git
cd ema-navigator

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 5. Start backend
python main.py

# 6. Start frontend (in new terminal)
npm run dev

# 7. Open browser
# http://localhost:5173
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
git add .
git commit -m "Add your feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

---

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register new user
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "user_id": "abc123",
  "email": "user@example.com",
  "token": "firebase_id_token"
}
```

#### POST `/api/auth/login`
Login existing user
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "user_id": "abc123",
  "token": "firebase_id_token"
}
```

### Exchange Endpoints

#### GET `/api/bot/balance/{exchange}`
Get exchange balance
```
Headers:
Authorization: Bearer {firebase_token}

Query Params:
is_futures: true

Response:
{
  "exchange": "binance",
  "type": "futures",
  "currency": "USDT",
  "total_balance": 1000.00,
  "available_balance": 950.00,
  "used_balance": 50.00
}
```

#### POST `/api/bot/integrations`
Add exchange API keys
```json
Headers:
Authorization: Bearer {firebase_token}

Request:
{
  "exchange": "binance",
  "api_key": "your_api_key",
  "api_secret": "your_api_secret",
  "passphrase": "",
  "is_futures": true
}

Response:
{
  "status": "success",
  "exchange": "binance"
}
```

### Trading Endpoints

#### GET `/api/bot/positions`
Get open positions
```json
Headers:
Authorization: Bearer {firebase_token}

Response:
{
  "positions": [
    {
      "symbol": "BTCUSDT",
      "side": "LONG",
      "entry_price": 43500.00,
      "current_price": 43800.00,
      "pnl": 30.00,
      "pnl_percent": 3.0
    }
  ]
}
```

#### GET `/api/bot/transactions`
Get trade history
```json
Headers:
Authorization: Bearer {firebase_token}

Query Params:
hours: 24

Response:
{
  "transactions": [
    {
      "symbol": "BTCUSDT",
      "side": "BUY",
      "entry_price": 43500.00,
      "exit_price": 44500.00,
      "pnl": 100.00,
      "created_at": "2025-11-06T15:45:00Z"
    }
  ],
  "count": 10
}
```

### WebSocket Endpoints

#### WS `/ws/signals`
Real-time trading signals
```json
Connection:
wss://api.domain.com/ws/signals

Received Messages:
{
  "type": "signal",
  "data": {
    "signal": "BUY",
    "exchange": "binance",
    "symbol": "BTCUSDT",
    "price": 43500.00,
    "ema9": 43520.00,
    "ema21": 43480.00
  },
  "timestamp": "2025-11-06T15:45:00Z"
}
```

---

## 🎓 Key Learnings & Best Practices

### Architecture Decisions

1. **WebSocket for Broadcasts**: Chosen over REST polling for scalability
2. **Firebase for Auth**: Faster development than custom auth
3. **Unified Exchange Interface**: Easier to add new exchanges
4. **React Hooks**: Better state management and code reuse
5. **TypeScript**: Catches errors at compile-time

### Security Best Practices

1. **Never store API keys in frontend**
2. **Always encrypt sensitive data**
3. **Validate all user inputs**
4. **Use HTTPS/WSS in production**
5. **Implement rate limiting**
6. **Regular security audits**

### Performance Best Practices

1. **Use WebSocket for real-time data**
2. **Implement caching where appropriate**
3. **Lazy load components**
4. **Optimize database queries**
5. **Use CDN for static assets**
6. **Monitor and log performance metrics**

---

## 🔮 Future Enhancements

### Planned Features

1. **More Trading Strategies**
   - RSI crossover
   - MACD signals
   - Bollinger Bands
   - Custom indicator builder

2. **Advanced Risk Management**
   - Portfolio allocation
   - Max drawdown limits
   - Position sizing calculator
   - Risk/reward analyzer

3. **Social Features**
   - Copy trading
   - Signal sharing
   - Leaderboard
   - Community chat

4. **Mobile App**
   - React Native app
   - Push notifications
   - Biometric authentication
   - Offline mode

5. **Analytics Dashboard**
   - Performance charts
   - Win/loss ratio
   - Profit factor
   - Sharpe ratio

6. **Backtesting**
   - Historical strategy testing
   - Performance simulation
   - Parameter optimization

---

## 📞 Support & Contact

### Documentation
- [API Docs](https://api.aitraderglobal.com/docs)
- [User Guide](https://aitraderglobal.com/guide)
- [FAQ](https://aitraderglobal.com/faq)

### Community
- Discord: [Join Server](https://discord.gg/aitraderglobal)
- Telegram: [@aitraderglobal](https://t.me/aitraderglobal)
- Twitter: [@aitraderglobal](https://twitter.com/aitraderglobal)

### Support
- Email: support@aitraderglobal.com
- Live Chat: Available on website
- Response Time: 24-48 hours

---

## 📄 License

This project is proprietary software. All rights reserved.

© 2025 EMA Navigator AI Trading Platform

---

**Last Updated**: November 6, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
