import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ArrowLeft, RefreshCw, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TradingForm } from '@/components/TradingForm';
import { PositionCard } from '@/components/PositionCard';
import { TradingChart } from '@/components/TradingChart';
import { useTrading } from '@/hooks/useTrading';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const Trading = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { positions, loading, refreshPositions } = useTrading();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string>('BTCUSDT');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPositions();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Activity className="h-8 w-8 text-primary" />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {t('trading.title')}
                </span>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* How to Use - Info Card */}
        <Card className="border-primary/20 bg-primary/5 mb-6 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">📊 Manuel İşlem Nasıl Yapılır?</h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground">
                  <li>Soldaki formdan işlem yapmak istediğiniz <strong>borsayı seçin</strong></li>
                  <li>İşlem yapacağınız <strong>coin çiftini</strong> girin (örn: BTCUSDT)</li>
                  <li><strong>LONG</strong> (yükseliş) veya <strong>SHORT</strong> (düşüş) pozisyon seçin</li>
                  <li>Yatırmak istediğiniz <strong>miktarı</strong> ve <strong>kaldıracı</strong> ayarlayın</li>
                  <li><strong>Take Profit (TP)</strong> ve <strong>Stop Loss (SL)</strong> oranlarını belirleyin</li>
                  <li>"Pozisyon Aç" butonuna tıklayın - pozisyonunuz sağda görünecektir</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Warning */}
        <Alert className="mb-6 border-destructive/50 bg-destructive/10 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>Risk Uyarısı:</strong> Futures işlemleri yüksek risklidir. Sadece kaybetmeyi göze alabileceğiniz miktarlarla işlem yapın. 
            Yüksek kaldıraç kullanımı kazancınızı artırabilir ancak aynı zamanda kayıplarınızı da büyütür.
          </AlertDescription>
        </Alert>

        {/* Trading Chart - Full Width */}
        <div className="mb-6">
          <TradingChart 
            symbol={selectedCoin} 
            exchange="binance"
            onSignalClick={(signal) => {
              toast.success(`${signal.type} sinyali yakalandı!`, {
                description: `Entry: $${signal.price.toFixed(2)} | TP: $${signal.tp.toFixed(2)} | SL: $${signal.sl.toFixed(2)}`
              });
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Form - Left Side */}
          <div className="lg:col-span-1">
            <Card className="border-primary/20 mb-4">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">İşlem Formu</h4>
                    <p className="text-xs text-muted-foreground">
                      Aşağıdaki formu doldurup manuel pozisyon açabilirsiniz
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <TradingForm onCoinChange={setSelectedCoin} />
          </div>

          {/* Open Positions - Right Side */}
          <div className="lg:col-span-2">
            <Card className="border-primary/20 mb-4">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <Activity className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Açık Pozisyonlarım</h4>
                    <p className="text-xs text-muted-foreground">
                      Burası şu anda açık olan işlemlerinizi gösterir. Her pozisyonun anlık kar/zarar durumunu takip edebilirsiniz.
                      Pozisyonlar TP/SL seviyelerine ulaştığında otomatik kapanır.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pozisyonlarım</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {positions.length > 0 
                        ? `${positions.length} aktif pozisyon` 
                        : 'Henüz açık pozisyon yok'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {t('common.refresh')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p>{t('common.loading')}</p>
                  </div>
                ) : positions.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="font-medium text-lg mb-2">{t('trading.no_positions')}</p>
                    <p className="text-sm text-muted-foreground mb-1">{t('trading.open_first_position')}</p>
                    <p className="text-xs text-muted-foreground">
                      Soldaki formu kullanarak ilk pozisyonunuzu açabilirsiniz
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {positions.map((position) => (
                      <PositionCard key={position.id} position={position} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            {positions.length === 0 && (
              <Card className="mt-6 border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    💡 İpuçları
                  </h4>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>TP (Take Profit): Kar hedefi. Fiyat bu seviyeye ulaşınca pozisyon otomatik kapanır</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>SL (Stop Loss): Zarar durdurma. Fiyat bu seviyeye düşünce pozisyon otomatik kapanır</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Kaldıraç: Yatırımınızı katlar. 10x kaldıraç = 100$ ile 1000$ pozisyon açarsınız</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>LONG: Fiyatın yükseleceğine bahis. SHORT: Fiyatın düşeceğine bahis</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Trading;