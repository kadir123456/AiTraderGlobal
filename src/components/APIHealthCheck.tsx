import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import axios from "axios";
<<<<<<< HEAD
import { Input } from "@/components/ui/input";

const LS_OVERRIDE_KEY = 'api_base_url_override';
=======
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49

export const APIHealthCheck = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [checking, setChecking] = useState(false);
<<<<<<< HEAD
  const [editingUrl, setEditingUrl] = useState<string>('');

  const getBaseUrl = () => localStorage.getItem(LS_OVERRIDE_KEY) || import.meta.env.VITE_API_URL || import.meta.env.VITE_TRADING_API_URL || 'http://localhost:8000';

  const applyOverride = (url: string) => {
    if (url) localStorage.setItem(LS_OVERRIDE_KEY, url);
    else localStorage.removeItem(LS_OVERRIDE_KEY);
    setApiUrl(getBaseUrl());
  };
=======
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49

  const checkHealth = async () => {
    setChecking(true);
    setStatus('checking');
<<<<<<< HEAD
    const baseUrl = getBaseUrl();
    setApiUrl(baseUrl);

=======
    
    const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_TRADING_API_URL || 'http://localhost:8000';
    setApiUrl(baseUrl);
    
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
    try {
      console.log('🔍 Checking API health at:', `${baseUrl}/health`);
      const response = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
      console.log('✅ API Health Response:', response.data);
<<<<<<< HEAD

=======
      
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
      if (response.status === 200) {
        setStatus('online');
        setErrorDetails('');
      }
    } catch (error: any) {
      console.error('❌ API Health Check Failed:', error);
      setStatus('offline');
<<<<<<< HEAD

=======
      
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
      if (error.code === 'ECONNABORTED') {
        setErrorDetails('Timeout - Backend yanıt vermiyor');
      } else if (error.response) {
        setErrorDetails(`HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        setErrorDetails('Network error - Backend erişilemiyor');
      } else {
        setErrorDetails(error.message || 'Unknown error');
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    setEditingUrl(localStorage.getItem(LS_OVERRIDE_KEY) || '');
=======
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
    checkHealth();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'offline':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">Online</Badge>;
      case 'offline':
      case 'error':
        return <Badge variant="destructive">Offline</Badge>;
      case 'checking':
        return <Badge variant="outline">Kontrol Ediliyor...</Badge>;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Backend API Durumu
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Base URL:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all flex-1 text-right">
              {apiUrl || 'Loading...'}
            </code>
          </div>
<<<<<<< HEAD

          <div className="flex items-center gap-2">
            <Input
              placeholder="https://your-backend.onrender.com"
              value={editingUrl}
              onChange={(e) => setEditingUrl(e.target.value)}
            />
            <Button size="sm" onClick={() => { applyOverride(editingUrl.trim()); checkHealth(); }}>
              Kaydet
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingUrl(''); applyOverride(''); checkHealth(); }}>
              Sıfırla
            </Button>
          </div>

=======
          
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
          {errorDetails && (
            <div className="bg-destructive/10 border border-destructive/20 rounded p-2 text-xs text-destructive">
              <strong>Error:</strong> {errorDetails}
            </div>
          )}
<<<<<<< HEAD

          <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
            <div><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || 'Not set'}</div>
            <div><strong>VITE_TRADING_API_URL:</strong> {import.meta.env.VITE_TRADING_API_URL || 'Not set'}</div>
            <div><strong>Override (LS):</strong> {localStorage.getItem(LS_OVERRIDE_KEY) || 'Not set'}</div>
=======
          
          <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
            <div><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || 'Not set'}</div>
            <div><strong>VITE_TRADING_API_URL:</strong> {import.meta.env.VITE_TRADING_API_URL || 'Not set'}</div>
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
            <div><strong>Mode:</strong> {import.meta.env.MODE}</div>
          </div>
        </div>

        <Button 
          size="sm" 
          variant="outline" 
          onClick={checkHealth}
          disabled={checking}
          className="w-full"
        >
          {checking ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Yeniden Kontrol Et
        </Button>

        {status === 'offline' && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <strong>Kontrol Listesi:</strong>
            <ul className="list-disc ml-4 mt-1 space-y-1">
<<<<<<< HEAD
              <li>Frontend statik domain ile Backend domain farklı olmalı.</li>
              <li>VITE_API_URL veya üstteki override doğru backend URL'ini göstermeli.</li>
              <li>Backend /health endpoint'i 200 dönmeli.</li>
              <li>CORS ayarları frontend domainini kapsamalı.</li>
=======
              <li>Backend servisi Render'da çalışıyor mu?</li>
              <li>VITE_API_URL doğru backend URL'ini gösteriyor mu?</li>
              <li>Backend /health endpoint'i aktif mi?</li>
              <li>CORS ayarları doğru mu?</li>
>>>>>>> 02c386b7a015e7a52419780c807e10200d842c49
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
