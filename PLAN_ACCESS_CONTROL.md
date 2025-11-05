# 📊 Plan Bazlı Erişim Kontrolü

## 🎯 PLAN ÖZETİ

| Özellik | FREE | PRO | PREMIUM |
|---------|------|-----|---------|
| **Fiyat** | $0 | $25/ay | $299/ay |
| **Borsa Bağlantısı** | ❌ Yok | ✅ 5 Borsa | ✅ Sınırsız |
| **Açık Pozisyon** | 1 Demo | ✅ 10 Gerçek | ✅ 50 Gerçek |
| **Spot Trading** | ❌ | ✅ | ✅ |
| **Futures/Leverage** | ❌ | ✅ 1x-125x | ✅ 1x-125x |
| **Auto-Trading** | ❌ | ✅ | ✅ |
| **TP/SL Yönetimi** | ❌ | ✅ | ✅ |
| **Custom Stratejiler** | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |
| **Support** | Community | Priority | Dedicated |

---

## 🆓 FREE KULLANICI ($0) - Demo Mod

### ✅ ERİŞEBİLİR:

#### Sayfalar
- ✅ Ana sayfa (/)
- ✅ Auth sayfası (/auth)
- ✅ Dashboard (/dashboard) - Read-only mod
- ✅ Pricing (/pricing)
- ✅ FAQ (/faq)
- ✅ Privacy (/privacy)
- ✅ Terms (/terms)

#### Dashboard Özellikleri
- ✅ Borsa fiyatlarını görüntüleme
- ✅ EMA sinyallerini görme
- ✅ Demo pozisyon açma (1 adet)
- ✅ Grafikleri görüntüleme
- ✅ İstatistikleri görme

#### Settings Sayfası
- ✅ Profil bilgilerini görüntüleme
- ✅ Dil değiştirme
- ✅ Para birimi değiştirme
- ⚠️ API key ekleme alanı görünür AMA:
  - "Pro'ya yükselt" mesajı gösterilir
  - API key kaydetme devre dışı

### ❌ ERİŞEMEZ:

#### Özellikler
- ❌ Gerçek borsa API key ekleme
- ❌ Gerçek pozisyon açma
- ❌ Spot trading
- ❌ Futures/Leverage trading
- ❌ Auto-trading bot
- ❌ TP/SL otomatik yönetimi
- ❌ Çoklu pozisyon (sadece 1 demo)
- ❌ Trading sayfası (/trading) - "Upgrade to Pro" mesajı

#### Mesajlar
- "🔒 Bu özellik Pro planında mevcut"
- "📈 Gerçek trading için Pro'ya yükseltin"
- "💎 1 pozisyon limitine ulaştınız - Pro: 10 pozisyon"

---

## 💼 PRO KULLANICI ($25/ay)

### ✅ ERİŞEBİLİR:

#### Tüm FREE Özellikleri +

#### Sayfalar
- ✅ Trading sayfası (/trading) - Tam erişim

#### Trading Özellikleri
- ✅ 5 farklı borsa API key ekleme
  - Binance
  - Bybit
  - OKX
  - KuCoin
  - MEXC
- ✅ Spot trading (Her borsada)
- ✅ Futures trading (Her borsada)
- ✅ Leverage kullanma (1x-125x)
- ✅ 10 açık pozisyon
- ✅ Auto-trading bot
- ✅ EMA 9/21 stratejisi
- ✅ TP/SL otomatik yönetimi

#### Settings Sayfası
- ✅ API key ekleme/silme
- ✅ Auto-trading ayarları
- ✅ Trading parametreleri ayarlama

#### Dashboard
- ✅ Gerçek bakiye gösterimi
- ✅ Tüm açık pozisyonlar
- ✅ Gerçek PnL hesaplama
- ✅ Transaction history

### ❌ ERİŞEMEZ:

- ❌ Custom stratejiler
- ❌ API access (REST API)
- ❌ Arbitrage modülü
- ❌ 10'dan fazla pozisyon
- ❌ 5'ten fazla borsa

#### Mesajlar
- "💎 Premium'da 50 pozisyon açabilirsiniz"
- "🚀 Custom stratejiler için Premium'a geçin"

---

## 👑 PREMIUM KULLANICI ($299/ay)

### ✅ ERİŞEBİLİR:

#### Tüm PRO Özellikleri +

#### Advanced Trading
- ✅ Sınırsız borsa bağlantısı
- ✅ 50 açık pozisyon
- ✅ Custom trading stratejileri
- ✅ Arbitrage modülü
- ✅ WebSocket fiyat updates
- ✅ Advanced backtesting

#### API Access
- ✅ REST API endpoints
- ✅ Webhook entegrasyonları
- ✅ Custom bot development
- ✅ API documentation

#### Premium Features
- ✅ Dedicated support (24/7)
- ✅ Priority order execution
- ✅ Advanced analytics
- ✅ Custom indicators
- ✅ Training & consulting
- ✅ 99.9% SLA garantisi

#### Özel Özellik Talepleri
- ✅ Yeni borsa entegrasyonu
- ✅ Custom stratejiler
- ✅ Özel raporlar

---

## 🔒 BACKEND ERİŞİM KONTROLÜ

### Endpoint Bazlı Kontrol

```python
# backend/auth.py

def check_feature_access(user_plan: str, feature: str) -> bool:
    """
    Check if user can access a feature based on their plan
    """
    access_matrix = {
        "api_keys": ["pro", "premium"],
        "spot_trading": ["pro", "premium"],
        "futures_trading": ["pro", "premium"],
        "auto_trading": ["pro", "premium"],
        "custom_strategies": ["premium"],
        "api_access": ["premium"],
        "arbitrage": ["premium"],
    }
    
    return user_plan in access_matrix.get(feature, [])

# Kullanım:
@app.post("/api/user/api-keys")
async def add_api_key(current_user = Depends(get_current_user)):
    user_plan = await get_user_plan(current_user["user_id"])
    
    if not check_feature_access(user_plan, "api_keys"):
        raise HTTPException(
            status_code=403,
            detail="Bu özellik Pro planında mevcut. Lütfen planınızı yükseltin."
        )
    # ... devam et
```

### Pozisyon Limiti Kontrolü

```python
# backend/main.py - create_position endpoint

user_plan = await get_user_plan(user_id)
current_positions = len(await get_open_positions(user_id))

plan_limits = {
    "free": 1,
    "pro": 10,
    "premium": 50
}

max_positions = plan_limits.get(user_plan, 1)

if current_positions >= max_positions:
    raise HTTPException(
        status_code=403,
        detail=f"Pozisyon limitine ulaştınız ({max_positions}). Daha fazla pozisyon için planınızı yükseltin."
    )
```

---

## 🎨 FRONTEND ERİŞİM KONTROLÜ

### Component Bazlı Kontrol

```typescript
// src/components/FeatureGuard.tsx

import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FeatureGuardProps {
  requiredPlan: 'pro' | 'premium';
  feature: string;
  children: React.ReactNode;
}

export const FeatureGuard = ({ requiredPlan, feature, children }: FeatureGuardProps) => {
  const { tier } = useSubscription();
  const navigate = useNavigate();
  
  const planOrder = { free: 0, pro: 1, premium: 2 };
  const hasAccess = planOrder[tier] >= planOrder[requiredPlan];
  
  if (!hasAccess) {
    return (
      <Alert>
        <AlertDescription>
          🔒 {feature} özelliği {requiredPlan.toUpperCase()} planında mevcut.
          <Button 
            variant="link" 
            onClick={() => navigate('/pricing')}
            className="ml-2"
          >
            Planınızı Yükseltin
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  return <>{children}</>;
};
```

### Kullanım Örneği

```typescript
// src/pages/Trading.tsx

<FeatureGuard requiredPlan="pro" feature="Gerçek Trading">
  <TradingForm />
</FeatureGuard>

// Settings.tsx - API Key bölümü
<FeatureGuard requiredPlan="pro" feature="API Key Yönetimi">
  <ExchangeConnectDialog />
</FeatureGuard>
```

---

## 📱 UI/UX GÖSTERGELER

### Plan Badge (Dashboard)
```tsx
{tier === 'free' && (
  <Badge variant="secondary">
    🆓 DEMO MOD - Pro'ya geçin
  </Badge>
)}

{tier === 'pro' && (
  <Badge variant="default">
    💼 PRO KULLANICI
  </Badge>
)}

{tier === 'premium' && (
  <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500">
    👑 PREMIUM
  </Badge>
)}
```

### Pozisyon Limiti Göstergesi
```tsx
<div className="text-sm text-muted-foreground">
  Açık Pozisyonlar: {currentPositions} / {maxPositions}
  {currentPositions >= maxPositions && (
    <Button variant="link" onClick={() => navigate('/pricing')}>
      Limit Artır
    </Button>
  )}
</div>
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend
- [x] Plan kontrolü fonksiyonları (`check_plan_limits`, `check_feature_access`)
- [x] Endpoint'lerde plan kontrolü
- [x] Pozisyon limiti kontrolü
- [ ] Database'de user plan storage
- [ ] LemonSqueezy webhook'larla plan güncelleme

### Frontend
- [ ] `FeatureGuard` component oluştur
- [ ] Tüm premium özelliklere guard ekle
- [ ] Plan badge'leri ekle
- [ ] Upgrade butonları ekle
- [ ] Free kullanıcılar için bilgilendirici mesajlar

### Testing
- [ ] Free kullanıcı testi (limitler çalışıyor mu?)
- [ ] Pro kullanıcı testi (10 pozisyon limiti)
- [ ] Premium kullanıcı testi (50 pozisyon limiti)
- [ ] API key ekleme erişim kontrolü
- [ ] Trading form erişim kontrolü

---

**Son Güncelleme**: 2024  
**Durum**: ✅ Documented
