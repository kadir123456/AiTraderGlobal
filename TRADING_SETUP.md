# Trading System Setup Guide

## Overview
This guide explains how the EMA Navigator AI trading system works and how to test it before deploying to production.

## System Architecture

### Frontend Components
- **Trading Page** (`src/pages/Trading.tsx`) - Main trading interface
- **TradingForm** (`src/components/TradingForm.tsx`) - Position opening form
- **PositionCard** (`src/components/PositionCard.tsx`) - Display open positions
- **Hooks**:
  - `useTrading.ts` - Manage positions and trading operations
  - `useTradingSettings.ts` - Load/save trading preferences
  - `useExchanges.ts` - Manage exchange connections
  - `useSubscription.ts` - Check user's plan and limits

### Backend API Endpoints
- `POST /api/bot/positions` - Open new position
- `GET /api/bot/positions` - Get open positions
- `DELETE /api/bot/positions/{id}` - Close position
- `POST /api/bot/ema-signal` - Get EMA trading signal
- `GET /api/bot/coins` - Get available trading pairs

## Subscription Plan Limits

### Free Plan ($0/month)
- 1 exchange connection
- 3 maximum open positions
- Demo mode only
- Community support

### Pro Plan ($29/month)
- 5 exchange connections
- 10 maximum open positions
- Real trading enabled
- EMA strategies
- TP/SL management
- Priority support

### Enterprise Plan ($299/month)
- Unlimited exchanges
- 50 maximum open positions
- Custom strategies
- API access
- Dedicated support
- SLA guarantee

## Trading Features

### 1. Multi-Exchange Support
Supported exchanges:
- **Binance** (Futures)
- **Bybit** (Derivatives)
- **OKX** (Futures)
- **KuCoin** (Futures)
- **MEXC** (Futures)

### 2. Available Trading Pairs
Popular pairs supported across all exchanges:
- BTC/USDT
- ETH/USDT
- BNB/USDT
- SOL/USDT
- XRP/USDT
- ADA/USDT
- DOGE/USDT
- AVAX/USDT
- DOT/USDT
- MATIC/USDT

### 3. Leverage Options
Leverage ranges by coin:
- BTC: 1x - 125x
- ETH: 1x - 100x
- Altcoins: 1x - 50x

**Warning**: Higher leverage = higher risk. Start with low leverage (1x-5x) if you're new to trading.

### 4. EMA Strategy (15-minute timeframe)
- **EMA 9** (Fast line)
- **EMA 21** (Slow line)
- **Signal**:
  - BUY: EMA 9 crosses above EMA 21
  - SELL: EMA 9 crosses below EMA 21
  - NEUTRAL: No clear signal

### 5. TP/SL Management
- **Take Profit (TP)**: Automatically close position at profit target
- **Stop Loss (SL)**: Automatically close position at loss limit
- Default settings: TP 2%, SL 1% (customizable in Settings)

## Testing Before Production

### 1. Local Development Test

#### Start Backend
```bash
cd backend
python main.py
```
Backend runs on http://localhost:8000

#### Start Frontend
```bash
npm run dev
```
Frontend runs on http://localhost:8080

#### Test Flow
1. Register/Login as new user
2. Go to Settings → Exchanges
3. Add exchange (use real API keys with testnet or small amounts)
4. Go to Trading page
5. Select exchange and coin
6. Check EMA signal
7. Set amount, leverage, TP/SL
8. Open LONG or SHORT position
9. View position in Open Positions list
10. Close position

### 2. Exchange API Keys Setup

**IMPORTANT SECURITY RULES**:
- ✅ Enable: READ, TRADE permissions
- ❌ Disable: WITHDRAWAL permissions
- ✅ Use testnet/demo accounts first
- ✅ Start with small amounts ($10-$50)
- ✅ Set IP whitelist if exchange supports

#### Binance Testnet
1. Go to [Binance Testnet](https://testnet.binancefuture.com)
2. Register for testnet account
3. Generate API keys (Settings → API Management)
4. Use these for testing (no real money)

#### Real Exchange Setup
1. Enable 2FA on your exchange account
2. Create API key with READ + TRADE only
3. Set IP whitelist (recommended)
4. Test with small amounts first
5. Never share API keys

### 3. Testing Checklist

Before deploying to production:

- [ ] User registration/login works
- [ ] Exchange connection saves encrypted API keys
- [ ] Subscription plan limits enforced (free: 1 exchange, pro: 5, enterprise: unlimited)
- [ ] Position limits enforced (free: 3, pro: 10, enterprise: 50)
- [ ] Coin list loads correctly
- [ ] EMA signal calculates correctly
- [ ] Position opening creates entry
- [ ] TP/SL prices calculate correctly
- [ ] Leverage applies correctly
- [ ] Position closing works
- [ ] Real-time price updates (TODO: implement WebSocket)
- [ ] P&L calculation accurate
- [ ] Settings save and load correctly

## Production Deployment

### 1. Deploy Backend to Render.com
See `RENDER_DEPLOYMENT.md` for detailed instructions.

Key steps:
- Create new Web Service
- Connect GitHub repo
- Set environment variables
- Deploy

### 2. Deploy Frontend to Render.com
- Create Static Site
- Build command: `npm run build`
- Publish directory: `dist`
- Set `VITE_API_URL` to backend URL

### 3. Environment Variables

#### Backend
```
JWT_SECRET_KEY=<generate-32-char-random-string>
ENCRYPTION_KEY=<generate-32-char-random-string>
PORT=8000
LEMONSQUEEZY_API_KEY=<from-lemonsqueezy-dashboard>
LEMONSQUEEZY_WEBHOOK_SECRET=<from-lemonsqueezy-dashboard>
FRONTEND_URL=https://your-frontend.onrender.com
```

#### Frontend
```
VITE_API_URL=https://your-backend.onrender.com
VITE_LEMONSQUEEZY_STORE_ID=<from-lemonsqueezy>
VITE_LEMONSQUEEZY_VARIANT_ID_FREE=<from-lemonsqueezy>
VITE_LEMONSQUEEZY_VARIANT_ID_PRO=<from-lemonsqueezy>
VITE_LEMONSQUEEZY_VARIANT_ID_ENTERPRISE=<from-lemonsqueezy>
```

## Real Trading Execution (TODO for Production)

Currently the system is in **DEMO MODE**. To enable real trading:

### 1. Implement Exchange API Calls
```python
# backend/main.py
async def execute_market_order(exchange: str, api_key: str, api_secret: str, 
                                 symbol: str, side: str, amount: float, leverage: int):
    if exchange == "binance":
        client = await create_binance_client(api_key, api_secret)
        # Set leverage
        await client.set_leverage(symbol=symbol, leverage=leverage)
        # Place order
        order = await client.create_order(
            symbol=symbol,
            side="BUY" if side == "LONG" else "SELL",
            type="MARKET",
            quantity=amount
        )
        return order
    # Implement for other exchanges
```

### 2. Store Positions in Database
Currently using in-memory mock data. Production needs:
- PostgreSQL or MongoDB for position storage
- Redis for real-time price caching
- WebSocket connections for live updates

### 3. Implement TP/SL Monitoring
```python
# Background worker to monitor positions
async def monitor_positions():
    while True:
        positions = await get_open_positions()
        for position in positions:
            current_price = await get_current_price(position.symbol)
            
            # Check TP
            if position.side == "LONG" and current_price >= position.tp_price:
                await close_position(position.id, "TP_HIT")
            
            # Check SL
            if position.side == "LONG" and current_price <= position.sl_price:
                await close_position(position.id, "SL_HIT")
        
        await asyncio.sleep(1)  # Check every second
```

### 4. WebSocket Price Updates
```typescript
// frontend/src/hooks/useRealtimePrice.ts
const useRealtimePrice = (exchange: string, symbol: string) => {
  const [price, setPrice] = useState(0);
  
  useEffect(() => {
    const ws = new WebSocket(`wss://${exchange}/ws/${symbol}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrice(data.price);
    };
    return () => ws.close();
  }, [exchange, symbol]);
  
  return price;
};
```

## Risk Management

### Position Sizing
Recommended position sizes:
- **Beginner**: 1-2% of capital per trade
- **Intermediate**: 2-5% of capital per trade
- **Advanced**: Max 10% of capital per trade

### Stop Loss Guidelines
- **Conservative**: 0.5-1% SL
- **Moderate**: 1-2% SL
- **Aggressive**: 2-5% SL

**Never risk more than you can afford to lose.**

### Leverage Safety
- **1x-5x**: Low risk, suitable for beginners
- **5x-10x**: Medium risk, for experienced traders
- **10x-50x**: High risk, only for experts
- **50x+**: Extreme risk, not recommended

## Monitoring & Alerts

### Implement Alerts (TODO)
- Email notification when position opens
- Telegram/Discord bot for TP/SL hits
- SMS alerts for large losses
- Daily P&L report email

### Analytics Dashboard (TODO)
- Total P&L over time
- Win rate percentage
- Average win/loss size
- Best performing pairs
- Risk/reward ratios

## Common Issues & Solutions

### Issue: "Exchange connection failed"
- Check API keys are correct
- Verify API permissions (READ + TRADE)
- Ensure IP whitelist includes server IP
- Check exchange API status

### Issue: "Position limit reached"
- User has hit plan limit
- Upgrade to higher plan or close positions
- Free: 3, Pro: 10, Enterprise: 50

### Issue: "Insufficient balance"
- User doesn't have enough USDT
- Top up exchange account
- Reduce position size

### Issue: "EMA signal not showing"
- Exchange API might be down
- Symbol not supported on that exchange
- Timeframe data not available

## Support & Resources

- [Binance API Docs](https://binance-docs.github.io/apidocs/futures/en/)
- [Bybit API Docs](https://bybit-exchange.github.io/docs/)
- [OKX API Docs](https://www.okx.com/docs-v5/en/)
- [TradingView EMA Strategy](https://www.tradingview.com/support/solutions/43000502589-exponential-moving-average-ema/)

## Next Steps

After deploying and testing:

1. ✅ Enable LemonSqueezy payments
2. ✅ Test all subscription tiers
3. ✅ Implement real trading execution
4. ✅ Add WebSocket price feeds
5. ✅ Set up monitoring and alerts
6. ✅ Create backup and recovery system
7. ✅ Write API documentation
8. ✅ Add rate limiting and security
9. ✅ Set up error logging (Sentry)
10. ✅ Create user onboarding flow

---

**Ready to deploy!** Follow `RENDER_DEPLOYMENT.md` for production setup.
