# LemonSqueezy Test Guide

## ✅ Yapılan Ayarlar

### 1. Webhook Ayarları ✅
- **Callback URL:** `https://aitraderglobal.onrender.com/api/payments/webhook`
- **Signing Secret:** `P2mF4tQx9zGjYch7vBnBkLp5rDs6wE3`
- **Events:** order_created, subscription_created, subscription_updated, subscription_cancelled, subscription_expired

### 2. Render Environment Variable
**Eklenecek:**
```env
LEMONSQUEEZY_WEBHOOK_SECRET=P2mF4tQx9zGjYch7vBnBkLp5rDs6wE3
```

**Nasıl:**
1. https://dashboard.render.com
2. "aitraderglobal" web service
3. Environment tab
4. Add Environment Variable
5. Key: `LEMONSQUEEZY_WEBHOOK_SECRET`
6. Value: `P2mF4tQx9zGjYch7vBnBkLp5rDs6wE3`
7. Save Changes (service restart olacak)

---

## 🧪 Test Adımları

### TEST 1: Webhook Endpoint Kontrolü
```bash
# Webhook çalışıyor mu kontrol et
curl -X POST https://aitraderglobal.onrender.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Beklenen: 200 OK veya webhook log
```

### TEST 2: Checkout Testi
1. https://aitraderglobal.com/pricing aç
2. "Get Started" butonuna tıkla (Pro plan)
3. LemonSqueezy checkout overlay açılacak
4. **Test kartı kullan:**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - Email: `test@example.com`
5. Complete Purchase tıkla

### TEST 3: Webhook Geldi mi?
**Render Logs kontrol et:**
```bash
# Beklenen loglar:
🔔 Webhook received: subscription_created
✅ Subscription saved for user_id: xxx
```

---

## 🚨 Sık Karşılaşılan Sorunlar

### 1. 404 Error: Page Not Found
**Sebep:** Store URL yanlış
**Çözüm:** Kod zaten düzeltildi ✅
```typescript
// DOĞRU:
https://aitraderglobal.lemonsqueezy.com/checkout/buy/1075011

// YANLIŞ:
https://ema-navigator.lemonsqueezy.com/checkout/buy/1075011
```

### 2. Webhook Signature Invalid
**Sebep:** LEMONSQUEEZY_WEBHOOK_SECRET yanlış veya eksik
**Çözüm:** Render environment variable kontrol et

### 3. CORS Error
**Sebep:** LemonSqueezy domain restrictions
**Çözüm:** Custom domain ayarını SİL (yapıldı ✅)

---

## 📊 Test Sonuçları

### Başarılı Test:
```
✅ Checkout overlay açıldı
✅ Ödeme tamamlandı
✅ Webhook alındı
✅ User subscription güncellendi
✅ Dashboard'a yönlendirildi
```

### Başarısız Test İşaretleri:
```
❌ 404: Page Not Found → Store URL kontrol
❌ 500: Internal Server Error → Webhook secret kontrol
❌ CORS error → Domain ayarlarını sil
```

---

## 🔐 Security Notes

**ÖNEMLI:**
- `LEMONSQUEEZY_WEBHOOK_SECRET` asla GitHub'a commit etme
- `.env` dosyasında tutma
- Sadece Render Environment Variables'da

**Webhook Security:**
- Her webhook request HMAC signature ile doğrulanıyor
- Invalid signature = 401 Unauthorized

---

## 🚀 Production'a Geçiş

**Test Mode → Live Mode:**
1. LemonSqueezy → Settings → General → "Activate Live Mode"
2. Products sayfasından **Live Mode Variant IDs** al
3. `src/lib/lemonsqueezy.ts` güncelle:
```typescript
variantIds: {
  pro: 'LIVE_VARIANT_ID_PRO',
  enterprise: 'LIVE_VARIANT_ID_ENTERPRISE',
}
```
4. Deploy et

**Test Mode vs Live Mode:**
| Feature | Test Mode | Live Mode |
|---------|-----------|-----------|
| Gerçek para | ❌ | ✅ |
| Test kartları | ✅ | ❌ |
| Variant IDs | Farklı | Farklı |
| Webhooks | Çalışır | Çalışır |
