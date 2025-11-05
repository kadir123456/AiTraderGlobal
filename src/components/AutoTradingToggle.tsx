import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/api';

export const AutoTradingToggle = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    watchlist: ['BTCUSDT', 'ETHUSDT'],
    interval: '15m',
    default_amount: 10,
    default_leverage: 10,
    default_tp: 5,
    default_sl: 2,
  });

  const [status, setStatus] = useState({
    active_monitors: 0,
    signals_today: 0,
    last_check: null,
  });

  useEffect(() => {
    fetchSettings();
    fetchStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auto-trading/settings');
      setSettings(response.data);
      setEnabled(response.data.enabled);
    } catch (error) {
      console.error('Failed to fetch auto-trading settings:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await api.get('/api/auto-trading/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch auto-trading status:', error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      await api.post('/api/auto-trading/settings', {
        ...settings,
        enabled: checked,
      });
      
      setEnabled(checked);
      toast.success(
        checked 
          ? 'Auto-trading enabled' 
          : 'Auto-trading disabled'
      );
      
      fetchStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update auto-trading');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      await api.post('/api/auto-trading/settings', {
        ...settings,
        enabled,
      });
      
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Automated Trading Bot</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-trading">{enabled ? 'Active' : 'Inactive'}</Label>
            <Switch
              id="auto-trading"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>
        </div>
        <CardDescription>
          Automatically open and close positions based on EMA 9/21 crossover signals
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {enabled && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground">Active Monitors</p>
              <p className="text-lg font-semibold">{status.active_monitors}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Signals Today</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                {status.signals_today}
                <TrendingUp className="h-4 w-4 text-success" />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Check</p>
              <p className="text-sm font-medium">
                {status.last_check ? new Date(status.last_check).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Time Interval</Label>
            <Select 
              value={settings.interval} 
              onValueChange={(val) => setSettings({...settings, interval: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15 Minutes</SelectItem>
                <SelectItem value="30m">30 Minutes</SelectItem>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="4h">4 Hours</SelectItem>
                <SelectItem value="1d">1 Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Amount (USDT)</Label>
              <Input
                type="number"
                value={settings.default_amount}
                onChange={(e) => setSettings({...settings, default_amount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Leverage</Label>
              <Select 
                value={settings.default_leverage.toString()} 
                onValueChange={(val) => setSettings({...settings, default_leverage: parseInt(val)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 20, 50, 100].map((lev) => (
                    <SelectItem key={lev} value={lev.toString()}>
                      {lev}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Take Profit (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.default_tp}
                onChange={(e) => setSettings({...settings, default_tp: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.default_sl}
                onChange={(e) => setSettings({...settings, default_sl: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Bot will automatically open positions when EMA signals are detected</li>
                <li>Positions will be closed automatically when TP or SL is hit</li>
                <li>Make sure you have sufficient balance in your exchange account</li>
                <li>Monitor your positions regularly</li>
              </ul>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleUpdateSettings}
            disabled={loading}
          >
            Update Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
