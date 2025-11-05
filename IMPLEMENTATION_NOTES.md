# Otomatik Trading Bot - Uygulama Notları

## Tamamlanan Özellikler ✅

### 1. Para Birimi Toggle (TRY/USD)
- `CurrencyContext` ve `CurrencyToggle` komponenti eklendi
- Dashboard'da TRY/USD arası geçiş yapılabiliyor
- Kur: 1 USD = 42.11 TRY (25 USD = 1052.75 TRY)

### 2. Fiyatlandırma Güncellemeleri
- Free Plan: $0 - Tüm borsalar görünür, sadece manuel trading
- Pro Plan: $25/ay - Sınırsız borsa + Otomatik trading
- Enterprise Plan: $299/ay - Korundu

### 3. Trading Form İyileştirmeleri
- Interval seçenekleri eklendi (15m, 30m, 1h, 4h, 1d)
- TP/SL Calculator komponenti - Gerçek zamanlı kar/zarar hesaplaması
- Risk/Reward ratio gösterimi

### 4. Backend Altyapısı (Python)

#### EMA Monitor Servisi (`backend/services/ema_monitor.py`)
Şu özellikleri içeriyor:
- EMA 9 ve EMA 21 hesaplaması
- Crossover detection (kesişim tespiti)
- Rate limiting (1200ms = 50 req/min)
- Otomatik pozisyon açma/kapatma
- TP/SL monitoring
- Kullanıcı bazlı monitoring tasks

#### API Endpoints (`backend/api/auto_trading.py`)
- `POST /api/auto-trading/settings` - Ayarları güncelle
- `GET /api/auto-trading/settings` - Ayarları getir
- `GET /api/auto-trading/status` - Bot durumu
- `GET /api/auto-trading/signals/history` - Sinyal geçmişi

#### Database Schema (`backend/database/schema_auto_trading.sql`)
Yeni tablolar:
- `auto_trading_settings` - Kullanıcı bot ayarları
- `ema_values` - EMA değerleri cache
- `trading_signals` - Sinyal geçmişi
- `positions` - Geliştirilmiş pozisyon tablosu
- `transaction_history` - İşlem geçmişi

### 5. Frontend Komponenti
- `AutoTradingToggle` - Settings'de bot kontrolü
- Gerçek zamanlı status gösterimi
- Ayarlanabilir parametreler

---

## Gerekli Entegrasyonlar 🔧

### 1. Backend Entegrasyonu

Backend'de şu dosyaları entegre etmeniz gerekiyor:

```python
# backend/main.py içinde
from .api.auto_trading import router as auto_trading_router
from .services.ema_monitor import EMAMonitor

# Router'ı ekle
app.include_router(auto_trading_router)

# Startup'da EMA monitor'u başlat
@app.on_event("startup")
async def startup_event():
    global ema_monitor
    ema_monitor = EMAMonitor(db_connection)
    
    # Load active users and start monitoring
    active_users = await get_active_auto_trading_users()
    for user in active_users:
        await ema_monitor.start_monitoring_user(user['id'], user['settings'])

@app.on_event("shutdown")
async def shutdown_event():
    if ema_monitor:
        await ema_monitor.cleanup()
```

### 2. Database Migration

SQL schema'yı çalıştırın:
```bash
psql -U your_user -d your_db -f backend/database/schema_auto_trading.sql
```

### 3. Environment Variables

`.env` dosyasına ekleyin:
```
# Rate limiting
MAX_REQUESTS_PER_MINUTE=50
MONITORING_INTERVAL_SECONDS=300

# Exchange API rate limits
BINANCE_RATE_LIMIT=1200
BYBIT_RATE_LIMIT=1200
```

---

## Kritik Özellikler 🚨

### Rate Limiting
Render.com IP'sinin ban yememesi için:

```python
# Her exchange başlatılırken
exchange = ccxt.binance({
    'enableRateLimit': True,
    'rateLimit': 1200,  # 1.2 saniye = 50 req/min
})

# Monitoring loop'ta
await asyncio.sleep(2)  # İstekler arası bekleme
```

### TP/SL Monitoring
Pozisyonlar açıldıktan sonra sürekli izlenir:
- Her 5 saniyede bir fiyat kontrolü
- TP veya SL'ye ulaşıldığında otomatik kapatma
- P&L hesaplama ve kaydetme

### EMA Crossover Detection
```python
# Bullish: EMA9 crosses above EMA21
if previous_ema9 < previous_ema21 and ema9 > ema21:
    signal = 'BUY'

# Bearish: EMA9 crosses below EMA21  
elif previous_ema9 > previous_ema21 and ema9 < ema21:
    signal = 'SELL'
```

---

## Test Senaryosu 🧪

### Manuel Test Adımları:

1. **Settings > Auto Trading**
   - Bot'u aktif et
   - Watchlist'e BTCUSDT ekle
   - Interval: 15m
   - Amount: 10 USDT
   - Leverage: 10x
   - TP: 5%, SL: 2%

2. **Sinyal Bekle**
   - Backend her 5 dakikada bir kontrol yapacak
   - EMA crossover olduğunda pozisyon açılacak

3. **Pozisyon İzle**
   - Dashboard'da açık pozisyonu gör
   - TP veya SL'ye ulaşana kadar izle
   - Otomatik kapanışı gözle

4. **İşlem Geçmişi**
   - Transaction history'de kaydı gör
   - P&L doğruluğunu kontrol et

---

## Geliştirme Notları 📝

### Yapılabilecek İyileştirmeler:

1. **WebSocket Integration**
   - Anlık fiyat güncellemeleri için
   - 5 saniyelik polling yerine

2. **Advanced Risk Management**
   - Max daily loss limit
   - Position size calculation based on account balance
   - Trailing stop-loss

3. **Multiple Strategy Support**
   - RSI, MACD gibi diğer indikatörler
   - Kullanıcı custom stratejileri

4. **Notification System**
   - Email/SMS bildirimleri
   - Pozisyon açılış/kapanış alerts

5. **Backtesting Module**
   - Historical data ile strateji testi
   - Performance metrics

---

## Güvenlik Önlemleri 🔒

1. **API Key Security**
   - Encryption at rest
   - Never log API secrets
   - Withdrawal permissions disabled

2. **Rate Limiting**
   - Per-user limits
   - Global exchange limits
   - Exponential backoff on errors

3. **Error Handling**
   - Graceful degradation
   - Automatic retry with backoff
   - User notifications on failures

4. **Monitoring**
   - Log all bot actions
   - Track failed requests
   - Monitor exchange connection health

---

## Production Checklist ☑️

Canlıya alınmadan önce:

- [ ] Database migrations çalıştırıldı
- [ ] Environment variables ayarlandı
- [ ] Rate limiting test edildi
- [ ] TP/SL logic doğrulandı
- [ ] Error handling test edildi
- [ ] Logging configured
- [ ] Monitoring dashboard hazır
- [ ] User documentation hazır
- [ ] Backup strategy hazır
- [ ] Emergency shutdown procedure hazır

---

## Destek & Sorun Giderme 🆘

### Sık Karşılaşılan Sorunlar:

**Bot pozisyon açmıyor**
- Exchange API keys doğru mu?
- Bakiye yeterli mi?
- EMA values hesaplanıyor mu?
- Rate limit aşıldı mı?

**Pozisyon kapanmıyor**
- Monitoring task çalışıyor mu?
- TP/SL price'lar doğru mu?
- Exchange connection aktif mi?

**Rate limit errors**
- Request frequency'i azalt
- Rate limit değerlerini artır
- Multiple exchange instances kullan

---

Son Güncelleme: 2025-11-05
Versiyon: 1.0.0
