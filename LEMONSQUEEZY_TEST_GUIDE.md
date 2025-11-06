# 🧪 LemonSqueezy Test Mode - Kurulum Rehberi

## ✅ Test Variant ID'leri (Onaylandı)

```
Pro Plan: 1075011
Enterprise Plan: 1075030
```

Bu ID'ler zaten kodda doğru şekilde ayarlandı. ✅

---

## 📋 KURULUM ADIMLARI

### 1️⃣ Firebase Rules Güncelle

**ÖNEMLİ:** Firebase Console'a gidip rules'u güncelle!

```bash
# Firebase Console
https://console.firebase.google.com/

1. Projeyi aç (onlineaviator-aa5a7)
2. Realtime Database seç
3. Rules sekmesine tıkla
4. firebase-rules.json içeriğini kopyala yapıştır
5. "Publish" butonuna bas
```

**Değişiklikler:**
- ✅ `subscriptions/` - Webhook'lar için yazılabilir
- ✅ `user_subscriptions/` - Kullanıcılar kendi subscription'ını yazabilir
- ✅ `orders/` - Sipariş kayıtları için
- ✅ `webhook_logs/` - Webhook logları için

---

### 2️⃣ LemonSqueezy Webhook Kurulumu

**LemonSqueezy Dashboard:**
https://app.lemonsqueezy.com/settings/webhooks

#### A. Test Mode'u Aktif Et
- Sağ üstte **"Test Mode"** toggle'ını aç (turuncu olmalı)

#### B. Webhook Endpoint Ekle

1. **+ Add Endpoint** butonuna tıkla
2. **URL:**
   ```
   https://aitraderglobal.onrender.com/api/payments/webhook
   ```
3. **Events** seç:
   - ✅ `order_created`
   - ✅ `subscription_created`
   - ✅ `subscription_updated`
   - ✅ `subscription_cancelled`

4. **Signing Secret:** (Opsiyonel - güvenlik için)
   - Kopyala ve not al
   - Backend'de kullanılacak (şimdilik gerekli değil)

5. **Save** butonuna bas

---

### 3️⃣ Test Kartı ile Ödeme Testi

#### Test Kredi Kartları:

**✅ Başarılı Ödeme:**
```
Kart Numarası: 4242 4242 4242 4242
Son Kullanma: 12/34 (herhangi bir gelecek tarih)
CVC: 123
ZIP Code: 12345
İsim: Test User
```

**❌ Reddedilen Kart:**
```
Kart Numarası: 4000 0000 0000 0002
Son Kullanma: 12/34
CVC: 123
```

---

### 4️⃣ Test Akışı

1. **Siteye Git:**
   ```
   https://aitraderglobal.onrender.com
   ```

2. **Login Ol:**
   - Google ile giriş yap
   - Console'da hata olmamalı

3. **Pricing Sayfasına Git:**
   - Ana sayfada "Pricing" butonuna tıkla
   - Veya direkt: `/pricing`

4. **Pro'ya Geç:**
   - "Pro'ya Geç" butonuna tıkla
   - LemonSqueezy checkout açılmalı
   - Test kartı ile ödeme yap (4242 4242 4242 4242)

5. **Webhook Kontrolü:**
   - Render.com → Backend Service → Logs
   - Şu mesajları aramalısın:
     ```
     🔔 Webhook received:
     📦 New order: 12345 | Email: user@email.com | Plan: pro
     ✅ Subscription saved for user@email.com
     ```

6. **Dashboard Kontrolü:**
   - Dashboard'a yönlendirilmelisin
   - Paket bilgisi "Pro" olmalı
   - Settings → Paketim sekmesinde "Pro Plan" görünmeli

---

## 🐛 Sorun Giderme

### ❌ Problem: Checkout 404 Hatası

**Test URL:**
```
https://ema-navigator.lemonsqueezy.com/checkout/buy/1075011
```

Tarayıcıda açıp test et:
- ✅ Açılıyorsa → Variant ID doğru
- ❌ 404 alıyorsan → LemonSqueezy Dashboard'da variant ID'yi kontrol et

**Çözüm:**
```typescript
// src/lib/lemonsqueezy.ts
variantIds: {
  pro: 'DOĞRU_TEST_VARIANT_ID',
  enterprise: 'DOĞRU_TEST_VARIANT_ID'
}
```

---

### ❌ Problem: Webhook Gelmiyor

**Kontrol Et:**

1. **LemonSqueezy Webhook URL:**
   - Settings → Webhooks
   - URL doğru mu: `https://aitraderglobal.onrender.com/api/payments/webhook`
   - Events seçili mi: `order_created`, `subscription_created`

2. **Backend Çalışıyor mu:**
   ```bash
   curl https://aitraderglobal.onrender.com/api/health
   # Beklenen: {"status": "ok"}
   ```

3. **Render Logs:**
   - Render Dashboard → Services → aitraderglobal → Logs
   - "webhook" kelimesini ara

4. **Test Webhook Gönder:**
   - LemonSqueezy Dashboard → Webhooks → "Send Test Event"

---

### ❌ Problem: Subscription Kaydedilmiyor

**Firebase Kontrolü:**

1. Firebase Console → Realtime Database
2. Data sekmesine git
3. `subscriptions/` altına bak
4. Email'in olmalı (örn: `user_gmail_com`)

**Backend Log Kontrolü:**
```bash
# Render logs'da ara:
"✅ Subscription saved"     # Başarılı
"⚠️ Firebase not initialized" # Firebase hatası
"❌ Error saving subscription" # Hata
```

**Çözüm:**
- Firebase rules güncelle (Adım 1)
- Backend'i yeniden deploy et

---

### ❌ Problem: Login Sonrası Permission Denied

**Console Hatası:**
```
FIREBASE WARNING: Permission denied
```

**Çözüm:**
1. Firebase Console → Realtime Database → Rules
2. `firebase-rules.json` içeriğini yapıştır
3. **Publish** butonuna bas
4. Sayfayı yenile (Ctrl+F5)

---

## 📊 Test Checklist

Deploy etmeden önce kontrol et:

- [ ] LemonSqueezy test mode aktif (turuncu toggle)
- [ ] Variant ID'ler doğru (1075011, 1075030)
- [ ] Firebase rules güncellendi ve publish edildi
- [ ] Webhook URL eklendi (`/api/payments/webhook`)
- [ ] Webhook events seçildi (order_created, subscription_created)
- [ ] Backend deploy edildi (Render.com)
- [ ] Frontend deploy edildi (Render.com)
- [ ] Test kartı ile ödeme denendi (4242 4242 4242 4242)
- [ ] Webhook backend'e geldi (logs kontrol)
- [ ] Subscription Firebase'e kaydedildi
- [ ] Dashboard'da plan güncellendi

---

## 🚀 Deploy Komutu

```bash
# Tüm değişiklikleri commit et
git add .
git commit -m "Fix: Firebase rules, webhook, test mode ready"
git push origin main

# Render otomatik deploy edecek
# Manuel deploy için: Render Dashboard → Manual Deploy
```

---

## 🎯 Test Senaryoları

### Senaryo 1: Pro Plan Satın Alma

1. Login ol (Google)
2. Pricing → "Pro'ya Geç"
3. Test kartı ile öde (4242 4242 4242 4242)
4. Dashboard'a yönlendir
5. Plan "Pro" olmalı
6. Settings → Otomatik Al-Sat açılmalı ✅

### Senaryo 2: Enterprise Plan Satın Alma

1. Login ol (Google)
2. Pricing → "Enterprise'a Geç"
3. Test kartı ile öde
4. Dashboard'a yönlendir
5. Plan "Enterprise" olmalı
6. Settings → Özel Stratejiler görünmeli ✅
7. Settings → Arbitraj görünmeli ✅

### Senaryo 3: Free Kullanıcı Limitleri

1. Yeni kullanıcı ile login ol
2. Plan "Free" olmalı
3. Settings → Otomatik Al-Sat **kapalı** olmalı 🔒
4. "Pro'ya Yükselt" butonu gösterilmeli

---

## 📞 Production Mode'a Geçiş

Test başarılı olduktan sonra:

1. **LemonSqueezy:**
   - Test Mode'u kapat
   - Production variant ID'leri al

2. **Kod Güncelle:**
   ```typescript
   // src/lib/lemonsqueezy.ts
   variantIds: {
     pro: 'PRODUCTION_PRO_VARIANT_ID',
     enterprise: 'PRODUCTION_ENTERPRISE_VARIANT_ID'
   }
   ```

3. **Webhook:**
   - Production webhook URL'i aynı kalacak
   - Production mode'da test et

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Switch to production mode"
   git push
   ```

---

## ✅ Hazır!

Tüm adımları tamamladıysan test yapmaya başlayabilirsin! 🚀

Hata alırsan Render logs'larını paylaş, birlikte çözeriz.
