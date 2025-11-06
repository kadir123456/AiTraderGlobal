# Admin Quick Setup Guide

## 🚀 Hızlı Admin Oluşturma

### Yöntem 1: Admin Setup Sayfası (ÖNERİLEN - EN KOLAY)

```bash
1. Tarayıcıda aç:
   Development: http://localhost:5173/admin-setup
   Production:  https://yoursite.com/admin-setup

2. Email/password ile giriş yap

3. Setup Key gir: admin123setup

4. "Setup Admin" butonuna tıkla

✅ TAMAMDIR! Artık admin'sin!
```

---

### Yöntem 2: Firebase Console'dan Manuel

#### ADIM 1: User UID'yi Bul

**Seçenek A - Dashboard'dan:**
```bash
1. http://localhost:5173/dashboard sayfasına git
2. En üstte User ID görünüyor
3. "Copy" butonuna tıkla
4. UID kopyalandı!
```

**Seçenek B - Firebase Console:**
```bash
1. https://console.firebase.google.com
2. Projeyi seç
3. Authentication → Users
4. Kullanıcıyı bul
5. UID kolonunu kopyala
```

**Seçenek C - Browser Console:**
```bash
1. Dashboard'da F12 aç
2. Console'a yaz:

   firebase.auth().currentUser.uid

3. UID'yi kopyala
```

---

#### ADIM 2: Firebase Realtime Database'de Role Ekle

```bash
1. Firebase Console aç:
   https://console.firebase.google.com

2. Projeyi seç

3. Sol menü → Realtime Database

4. "Data" tab'ı

5. Root'ta "+" butonuna tıkla

6. Şu yapıyı oluştur:
```

**JSON Yapısı:**
```json
{
  "user_roles": {
    "YOUR_USER_UID_HERE": {
      "role": "admin",
      "email": "your@email.com",
      "createdAt": "2025-11-06T18:00:00.000Z"
    }
  }
}
```

**Adım adım:**
```
a) Name: user_roles
   Type: Object
   [Add]

b) user_roles altında "+" tıkla
   Name: abc123xyz456  ← BURAYA USER UID YAPISTIR
   Type: Object
   [Add]

c) UID altında 3 field ekle:

   Field 1:
   Name:  role
   Value: admin
   Type:  string

   Field 2:
   Name:  email
   Value: your@email.com
   Type:  string

   Field 3:
   Name:  createdAt
   Value: 2025-11-06T18:00:00.000Z
   Type:  string

d) [Add] butonuna tıkla

✅ TAMAMDIR!
```

---

#### ADIM 3: Test Et

```bash
1. Sayfayı yenile (F5)

2. Dashboard'da "Admin" butonu görünmeli

3. Admin butonuna tıkla

4. Admin paneli açılırsa ✅ BAŞARILI!
```

---

## 🔍 Sorun Giderme

### "Admin butonu görünmüyor"

**Çözüm 1: Sayfayı yenile**
```bash
Ctrl+R veya F5
```

**Çözüm 2: Cache temizle**
```bash
Ctrl+Shift+R (hard refresh)
```

**Çözüm 3: Logout/Login**
```bash
1. Logout yap
2. Login ol
3. Admin butonu geldi mi kontrol et
```

**Çözüm 4: Firebase Database kontrol**
```bash
1. Firebase Console → Realtime Database
2. user_roles/{YOUR_UID}/role
3. Value: "admin" olmalı
4. Yanlışsa düzelt
```

---

### "Access denied. Admin only." hatası

**Sebep:** Role doğru atanmamış

**Çözüm:**
```bash
1. Firebase Console aç
2. Realtime Database
3. user_roles/{YOUR_UID}/role
4. Değeri kontrol et: "admin" olmalı
5. Değilse düzelt ve kaydet
6. Sayfayı yenile
```

---

### "user_roles not found" hatası

**Sebep:** Firebase'de user_roles node'u yok

**Çözüm:**
```bash
1. Firebase Console → Realtime Database
2. Root'ta "+" tıkla
3. Name: user_roles
4. Yukarıdaki adımları tekrar et
```

---

## 📋 Checklist

Şunları yaptım:
- [ ] User UID'yi buldum
- [ ] Firebase Console'a girdim
- [ ] Realtime Database'i açtım
- [ ] user_roles oluşturdum
- [ ] user_roles/{UID} oluşturdum
- [ ] role: "admin" ekledim
- [ ] email ekledim
- [ ] createdAt ekledim
- [ ] Sayfayı yeniledim
- [ ] Admin butonu göründü
- [ ] Admin paneline girebildim

---

## 🎯 Örnek Firebase Database Yapısı

```json
{
  "user_roles": {
    "abc123xyz456": {
      "role": "admin",
      "email": "admin@example.com",
      "createdAt": "2025-11-06T18:00:00.000Z"
    },
    "def789uvw012": {
      "role": "admin",
      "email": "admin2@example.com",
      "createdAt": "2025-11-06T19:00:00.000Z"
    },
    "ghi345rst678": {
      "role": "user",
      "email": "user@example.com",
      "createdAt": "2025-11-06T20:00:00.000Z"
    }
  }
}
```

---

## 🔐 Güvenlik Notları

### Production'da Setup Key Değiştir!

**Önemli:** Default setup key: `admin123setup`

**Production'da değiştir:**

1. `src/pages/AdminSetup.tsx` dosyasını aç

2. Satır 20'yi bul:
```typescript
const SETUP_KEY = 'admin123setup';
```

3. Değiştir:
```typescript
const SETUP_KEY = process.env.VITE_ADMIN_SETUP_KEY || 'super-secret-key-12345';
```

4. `.env` dosyasına ekle:
```bash
VITE_ADMIN_SETUP_KEY=your-super-secret-key-here
```

5. Deploy et

---

## 💡 İpuçları

### Birden Fazla Admin Oluştur

```bash
Her admin için:
1. User UID'yi bul
2. Firebase'de user_roles/{UID} ekle
3. role: "admin" ata
```

### Admin Rolünü Kaldır

```bash
1. Firebase Console
2. Realtime Database
3. user_roles/{UID}
4. "role" field'ını "user" yap veya sil
```

### Tüm Admin'leri Gör

```bash
1. Firebase Console
2. Realtime Database
3. user_roles node'unu aç
4. role: "admin" olanları bul
```

---

## 🆘 Hala Sorun mu Var?

### Console Log Kontrol

```bash
1. Dashboard'da F12 aç
2. Console tab'ına git
3. "Error checking admin role" ara
4. Hata varsa screenshot al ve paylaş
```

### Network Tab Kontrol

```bash
1. F12 → Network tab
2. Sayfayı yenile
3. Firebase isteklerine bak
4. 401/403 hata var mı?
```

### Firebase Rules Kontrol

```bash
1. Firebase Console → Realtime Database
2. "Rules" tab'ı
3. Şu kurala sahip olmalısın:

{
  "rules": {
    "user_roles": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

**Son Güncelleme:** 2025-11-06
**Versiyon:** 1.0.0
