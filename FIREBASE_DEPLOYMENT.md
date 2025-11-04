# Firebase Functions Deployment Guide

Bu doküman, AI Trader projesinin Firebase Cloud Functions'larını deploy etmek için gerekli adımları içerir.

## Ön Koşullar

1. Firebase CLI kurulu olmalı:
```bash
npm install -g firebase-tools
```

2. Firebase hesabınıza giriş yapın:
```bash
firebase login
```

3. Firebase projesi oluşturulmuş olmalı (Firebase Console'dan)

## Adım 1: Firebase Projesini Başlatma

Proje kök dizininde:

```bash
firebase init functions
```

- `JavaScript` seçin
- Mevcut projenizi seçin
- ESLint kullanmak ister misiniz? **No** (isteğe bağlı)
- Dependencies şimdi yüklensin mi? **Yes**

## Adım 2: Dependencies Kurulumu

`functions/` klasörüne gidin ve gerekli paketleri yükleyin:

```bash
cd functions
npm install crypto axios firebase-admin firebase-functions
```

## Adım 3: Function Dosyalarını Kopyalama

Bu repo'daki `functions/` klasöründeki dosyaları Firebase functions klasörüne kopyalayın:

- `validateExchange.js`
- `removeExchange.js`

Ve `functions/index.js` dosyasını oluşturun:

```javascript
const validateExchange = require('./validateExchange');
const removeExchange = require('./removeExchange');

exports.validateExchange = validateExchange.validateExchange;
exports.removeExchange = removeExchange.removeExchange;
```

## Adım 4: Encryption Key Ayarlama

**ÖNEMLİ:** 32 karakter uzunluğunda güvenli bir encryption key oluşturun:

```bash
# Rastgele 32 karakter key oluşturma (Linux/Mac)
openssl rand -base64 32 | cut -c1-32

# Windows'ta PowerShell ile
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Ardından Firebase Functions config'e ekleyin:

```bash
firebase functions:config:set encryption.key="YOUR_32_CHAR_KEY_HERE"
```

## Adım 5: Firebase Functions Deploy

Functions'ları deploy edin:

```bash
firebase deploy --only functions
```

Deploy başarılı olduktan sonra, function URL'lerini alacaksınız:

```
✔  functions[validateExchange(us-central1)]: Successful create operation.
Function URL (validateExchange): https://us-central1-YOUR-PROJECT.cloudfunctions.net/validateExchange

✔  functions[removeExchange(us-central1)]: Successful create operation.
Function URL (removeExchange): https://us-central1-YOUR-PROJECT.cloudfunctions.net/removeExchange
```

## Adım 6: Frontend Configuration

Functions deploy edildikten sonra, frontend projesindeki `.env` dosyasına function URL'lerini ekleyin:

```bash
# .env veya .env.production
VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-YOUR-PROJECT.cloudfunctions.net
```

## Firebase Realtime Database Rules

Firebase Console'dan Realtime Database > Rules bölümüne gidin ve şu kuralları ekleyin:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "exchanges": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "settings": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "subscription": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    },
    "secure_keys": {
      "$uid": {
        ".read": false,
        ".write": false
      }
    }
  }
}
```

**ÖNEMLİ:** `secure_keys` node'una hiç kimse okuma/yazma yetkisi yok. Sadece Firebase Functions erişebilir.

## Test Etme

Exchange bağlantısını test etmek için:

1. Frontend'de Settings sayfasına gidin
2. "Add Exchange" butonuna tıklayın
3. Bir borsa seçin (Binance, Bybit, OKX)
4. API Key ve Secret girin
5. "Connect Exchange" butonuna tıklayın

Başarılı bağlantıda Firebase Realtime Database'de şu şekilde kayıtlar görmelisiniz:

```
users/
  └─ {userId}/
      └─ exchanges/
          └─ binance_1234567890/
              ├─ name: "binance"
              ├─ status: "connected"
              ├─ addedAt: "2024-01-01T00:00:00.000Z"
              └─ lastChecked: "2024-01-01T00:00:00.000Z"

secure_keys/
  └─ {userId}/
      └─ binance_1234567890/
          ├─ exchange: "binance"
          ├─ apiKey: "iv:encryptedkey..."
          ├─ apiSecret: "iv:encryptedsecret..."
          └─ createdAt: 1234567890000
```

## Troubleshooting

### Error: "ENCRYPTION_KEY must be exactly 32 characters"

Encryption key'i doğru ayarladığınızdan emin olun:
```bash
firebase functions:config:get
```

Doğru değilse tekrar ayarlayın ve redeploy edin.

### Error: "Failed to validate exchange credentials"

- API key ve secret doğru mu kontrol edin
- Borsanın API izinlerini kontrol edin (READ ve TRADE olmalı)
- Firebase Functions loglarını kontrol edin:
```bash
firebase functions:log
```

### CORS Errors

Functions'lar zaten CORS headers içeriyor. Eğer hala CORS hatası alıyorsanız, frontend URL'inizi Firebase Console > Functions > Runtime settings'den "Allowed origins"e ekleyin.

## Güvenlik Notları

1. ✅ API anahtarları AES-256-CBC ile şifrelenir
2. ✅ Encryption key Firebase Functions config'de saklanır (git'e push edilmez)
3. ✅ `secure_keys` node'una sadece Functions erişebilir
4. ✅ Kullanıcılar sadece kendi verilerine erişebilir
5. ⚠️ API keys'leri asla client-side'da decrypt etmeyin
6. ⚠️ Withdrawal permission'ları asla etkinleştirmeyin

## Production Checklist

- [ ] Encryption key güvenli ve 32 karakter
- [ ] Firebase Functions deploy edildi
- [ ] VITE_FIREBASE_FUNCTIONS_URL .env'de ayarlandı
- [ ] Realtime Database rules production'a uygun
- [ ] Test exchange bağlantısı başarılı
- [ ] Firebase Functions logging aktif
- [ ] CORS ayarları doğru
- [ ] API key encryption test edildi

## Sonraki Adımlar

Şimdi diğer yüksek öncelikli görevlere geçebilirsiniz:

1. ✅ Exchange Connect (Tamamlandı)
2. ⏭️ Settings Panel (Tamamlandı)
3. ⏭️ Payment / Subscription (Paddle entegrasyonu)
4. ⏭️ Demo vs Live Mode Toggle
5. ⏭️ EMA Backend Functions
