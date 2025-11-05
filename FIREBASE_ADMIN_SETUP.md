# Firebase Admin Setup Guide

Bu belge, AI Trader projesinde admin kullanıcısı oluşturmak için gereken adımları açıklar.

## Admin Kullanıcısı Oluşturma

### Adım 1: Firebase Console'a Giriş

1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. `onlineaviator-aa5a7` projesini seçin
3. Sol menüden **Realtime Database** seçeneğine tıklayın

### Adım 2: Admin Rolü Ekleme

Firebase Realtime Database'de aşağıdaki yapıyı oluşturun:

```json
{
  "user_roles": {
    "USER_UID_HERE": {
      "role": "admin",
      "updatedAt": "2024-01-XX..."
    }
  }
}
```

**USER_UID_HERE** yerine admin yapmak istediğiniz kullanıcının Firebase UID'sini yazın.

### Kullanıcı UID'sini Bulma

1. Firebase Console'da **Authentication** > **Users** bölümüne gidin
2. Admin yapmak istediğiniz kullanıcıyı bulun
3. Kullanıcının satırına tıklayın
4. **User UID** alanını kopyalayın

### Adım 3: Manuel Veri Ekleme

Firebase Realtime Database'de:

1. `+` butonuna tıklayın (Add child)
2. **Name**: `user_roles` yazın, **Value**: boş bırakın
3. `user_roles` node'una tıklayın
4. `+` butonuna tıklayın
5. **Name**: Kullanıcının UID'si, **Value**: boş bırakın
6. UID node'una tıklayın
7. `+` butonuna tıklayın
8. **Name**: `role`, **Value**: `admin`
9. Tekrar `+` butonuna tıklayın
10. **Name**: `updatedAt`, **Value**: `2024-01-XX...` (güncel tarih)

## Alternatif: REST API ile Ekleme

Curl komutu ile de ekleyebilirsiniz:

```bash
curl -X PUT \
  'https://onlineaviator-aa5a7-default-rtdb.firebaseio.com/user_roles/USER_UID_HERE.json' \
  -H 'Content-Type: application/json' \
  -d '{
    "role": "admin",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }'
```

## Admin Panel Erişimi

Admin rolü eklendikten sonra:

1. Uygulamaya giriş yapın
2. Dashboard'da sağ üst köşede **Admin** butonu görünecektir
3. **Admin** butonuna tıklayarak admin paneline erişebilirsiniz

## Admin Panel Özellikleri

Admin panelinde şunları yapabilirsiniz:

- ✅ Tüm kullanıcıları görüntüleme
- ✅ Kullanıcı rollerini değiştirme (user/admin)
- ✅ Kullanıcı aboneliklerini değiştirme (free/pro/enterprise)
- ✅ Kullanıcı istatistiklerini görüntüleme
- ✅ Abonelik durumlarını güncelleme

## Güvenlik Notları

⚠️ **ÖNEMLİ:** 
- Admin rolü çok güçlü yetkiler sağlar
- Sadece güvenilir kullanıcılara admin rolü verin
- Admin işlemlerini düzenli olarak loglayin
- Production ortamında admin sayısını minimum tutun

## Database Rules (Güvenlik)

Firebase Realtime Database Rules'u aşağıdaki gibi ayarlayın:

```json
{
  "rules": {
    "user_roles": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && root.child('user_roles').child(auth.uid).child('role').val() == 'admin'"
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "user_subscriptions": {
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('user_roles').child(auth.uid).child('role').val() == 'admin')",
        ".write": "auth != null && root.child('user_roles').child(auth.uid).child('role').val() == 'admin'"
      }
    }
  }
}
```

## Sorun Giderme

### Admin butonu görünmüyor
- Kullanıcı UID'sinin doğru olduğundan emin olun
- Firebase Database'de `user_roles/UID/role` yolunun `admin` değerinde olduğunu kontrol edin
- Sayfayı yenileyin (Ctrl+F5)
- Console'da hata olup olmadığını kontrol edin

### Admin paneline erişemiyorum
- `/admin` route'unun App.tsx'te tanımlı olduğunu kontrol edin
- useAdmin hook'unun çalıştığını kontrol edin
- Firebase connection'ın aktif olduğunu doğrulayın

## Test Senaryosu

1. Normal kullanıcı olarak giriş yapın → Admin butonu görünmemeli
2. Kullanıcıya admin rolü ekleyin
3. Sayfayı yenileyin → Admin butonu görünmeli
4. Admin butonuna tıklayın → Admin paneline yönlendirilmeli
5. Kullanıcı listesini görüntüleyin
6. Bir kullanıcının aboneliğini değiştirin
7. Değişikliğin kaydedildiğini doğrulayın
