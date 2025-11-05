# 🍋 LemonSqueezy Entegrasyon Rehberi

## ✅ HAZIR OLANLAR

Backend ve frontend tamamen hazır! Sadece LemonSqueezy ayarlarını yapmanız gerekiyor.

---

## 📋 ADIM 1: LemonSqueezy Hesabı Oluştur

1. https://lemonsqueezy.com adresine git
2. Hesap oluştur (ücretsiz)
3. Store oluştur (örn: "AI Trader Store")

---

## 📋 ADIM 2: Ürünler Oluştur

### Pro Plan Oluştur
1. Products → Create Product
2. **Name**: AI Trader Pro
3. **Description**: Professional trading features
4. **Pricing**: $25/month (monthly) veya $250/year (yearly)
5. **Type**: Subscription
6. **Billing Period**: Monthly veya Yearly
7. Kaydet ve **Variant ID**'yi not et

### Premium Plan Oluştur
1. Products → Create Product
2. **Name**: AI Trader Premium
3. **Description**: Premium trading features
4. **Pricing**: $299/month (monthly) veya $2990/year (yearly)
5. **Type**: Subscription
6. **Billing Period**: Monthly veya Yearly
7. Kaydet ve **Variant ID**'yi not et

---

## 📋 ADIM 3: Webhook Ayarla

1. Settings → Webhooks → Create Webhook
2. **URL**: `https://your-backend.onrender.com/api/payments/webhook`
3. **Events**'i seç:
   - ✅ `order_created`
   - ✅ `subscription_created`
   - ✅ `subscription_updated`
   - ✅ `subscription_cancelled`
   - ✅ `subscription_expired`
4. **Signing Secret**'i kopyala (webhook imzası için)

---

## 📋 ADIM 4: API Key Al

1. Settings → API
2. **Create API Key**
3. Kopyala ve sakla

---

## 📋 ADIM 5: Backend Environment Variables Ekle

Render.com'da backend servisinize şu değişkenleri ekleyin:

```env
# LemonSqueezy
LEMONSQUEEZY_API_KEY=your-api-key-here
LEMONSQUEEZY_WEBHOOK_SECRET=your-signing-secret-here
```

---

## 📋 ADIM 6: Variant ID'leri Güncelle

`backend/api/payments.py` dosyasında `get_plan_from_variant()` fonksiyonunu güncelleyin:

```python
def get_plan_from_variant(variant_id: str) -> str:
    variant_map = {
        "YOUR_PRO_MONTHLY_VARIANT_ID": "pro",
        "YOUR_PRO_YEARLY_VARIANT_ID": "pro",
        "YOUR_PREMIUM_MONTHLY_VARIANT_ID": "premium",
        "YOUR_PREMIUM_YEARLY_VARIANT_ID": "premium",
    }
    return variant_map.get(str(variant_id), "free")
```

---

## 📋 ADIM 7: Frontend Checkout URL'lerini Ayarla

`src/pages/Pricing.tsx` dosyasında `handleSubscribe` fonksiyonunu güncelleyin:

```typescript
const handleSubscribe = async (planId: string) => {
  if (!user) {
    toast.error('Lütfen önce giriş yapın');
    navigate('/auth');
    return;
  }

  if (planId === 'free') {
    toast.info('Zaten ücretsiz plandayın');
    return;
  }

  // Variant ID'leri ayarlayın
  const variantIds = {
    pro_monthly: 'YOUR_PRO_MONTHLY_VARIANT_ID',
    pro_yearly: 'YOUR_PRO_YEARLY_VARIANT_ID',
    premium_monthly: 'YOUR_PREMIUM_MONTHLY_VARIANT_ID',
    premium_yearly: 'YOUR_PREMIUM_YEARLY_VARIANT_ID',
  };

  const variantId = billingPeriod === 'monthly' 
    ? variantIds[`${planId}_monthly`]
    : variantIds[`${planId}_yearly`];

  const checkoutUrl = `https://your-store.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${user.email}&checkout[custom][user_id]=${user.uid}`;
  
  window.location.href = checkoutUrl;
};
```

---

## 📋 ADIM 8: Test Et

### Test Mode (Sandbox)
1. LemonSqueezy'de "Test Mode" aktif et
2. Test kartı kullan: `4242 4242 4242 4242`
3. CVV: Herhangi 3 rakam
4. Expiry: Gelecekte bir tarih

### Test Adımları:
1. ✅ Pricing sayfasına git (`/pricing`)
2. ✅ Pro plana tıkla
3. ✅ LemonSqueezy checkout'a yönlendir
4. ✅ Ödemeyi tamamla
5. ✅ Webhook'un çalıştığını kontrol et (backend logs)
6. ✅ Dashboard'da planın güncellendiğini gör

---

## 📋 ADIM 9: Production'a Geç

1. LemonSqueezy'de "Test Mode"u kapat
2. Gerçek ödeme bilgileriyle test et
3. Webhook'ların production URL'ini kullandığından emin ol

---

## 🔧 WEBHOOK TEST

Backend'de webhook logları görüntüle:

```bash
# Render.com logs
render logs --tail

# Webhook event geldiğinde göreceksiniz:
📦 LemonSqueezy webhook: order_created
✅ New subscription: user@example.com -> pro
```

---

## 📝 PLANLARIN ÖZELLİKLERİ

### FREE ($0)
- ✅ Dashboard görüntüleme
- ✅ Borsa fiyatları izleme
- ✅ EMA sinyalleri
- ✅ 1 demo pozisyon
- ❌ Gerçek API bağlantısı
- ❌ Auto-trading

### PRO ($25/ay)
- ✅ FREE + Tüm özellikleri
- ✅ 5 Borsa API bağlantısı
- ✅ Spot & Futures
- ✅ Leverage (1x-125x)
- ✅ 10 açık pozisyon
- ✅ Auto-trading
- ✅ TP/SL yönetimi

### PREMIUM ($299/ay)
- ✅ PRO + Tüm özellikleri
- ✅ Unlimited borsalar
- ✅ 50 açık pozisyon
- ✅ Custom stratejiler
- ✅ API access
- ✅ Dedicated support

---

## 🐛 Sorun Giderme

### Webhook Çalışmıyor
1. Webhook URL'nin doğru olduğunu kontrol et
2. HTTPS kullanıldığından emin ol
3. Signing secret'ın doğru olduğunu kontrol et
4. Backend loglarını incele

### Plan Güncellenmiyor
1. Webhook'un başarıyla geldiğini kontrol et
2. Database bağlantısını kontrol et
3. Firebase Realtime Database'de kullanıcı planını manuel kontrol et

### Checkout Sayfası Açılmıyor
1. Variant ID'lerin doğru olduğunu kontrol et
2. Store URL'inin doğru olduğunu kontrol et
3. Browser console'da hata var mı kontrol et

---

## 📞 Destek

- LemonSqueezy Docs: https://docs.lemonsqueezy.com
- LemonSqueezy Support: support@lemonsqueezy.com
- AI Trader Support: (sizin email)

---

## ✅ CHECKLIST

Tamamlandı mı?
- [ ] LemonSqueezy hesabı oluşturuldu
- [ ] Pro plan oluşturuldu (monthly & yearly)
- [ ] Premium plan oluşturuldu (monthly & yearly)
- [ ] Webhook ayarlandı
- [ ] API key alındı
- [ ] Backend env variables eklendi
- [ ] Variant ID'ler güncellendi
- [ ] Frontend checkout URL'leri ayarlandı
- [ ] Test modda test edildi
- [ ] Production'da test edildi
- [ ] Webhook logları kontrol edildi

---

**Son Güncelleme**: 2024
**Durum**: ✅ Hazır
