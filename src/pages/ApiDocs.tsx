import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Copy, Key, Code, Book, Terminal, Eye, EyeOff } from 'lucide-react';

export const ApiDocs = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const generateApiKey = () => {
    const newKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    toast.success('API Key generated successfully!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/account/balance',
      description: 'Get account balance across all connected exchanges',
      example: `curl -X GET "https://api.aitraderglobal.com/v1/account/balance" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "success": true,
  "data": {
    "total_balance_usdt": 12543.50,
    "exchanges": [
      {
        "exchange": "binance",
        "balance": 8234.20
      }
    ]
  }
}`,
    },
    {
      method: 'POST',
      path: '/api/v1/trade/open',
      description: 'Open a new trading position',
      example: `curl -X POST "https://api.aitraderglobal.com/v1/trade/open" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "exchange": "binance",
    "symbol": "BTCUSDT",
    "side": "long",
    "amount": 100,
    "leverage": 10,
    "take_profit": 5.0,
    "stop_loss": 2.0
  }'`,
      response: `{
  "success": true,
  "data": {
    "order_id": "ord_123456",
    "status": "filled",
    "entry_price": 43250.50
  }
}`,
    },
    {
      method: 'GET',
      path: '/api/v1/positions',
      description: 'Get all open positions',
      example: `curl -X GET "https://api.aitraderglobal.com/v1/positions" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "pos_789",
        "symbol": "BTCUSDT",
        "side": "long",
        "size": 0.1,
        "entry_price": 43250.50,
        "pnl": 125.40,
        "pnl_percent": 2.9
      }
    ]
  }
}`,
    },
    {
      method: 'GET',
      path: '/api/v1/signals/ema',
      description: 'Get EMA trading signals',
      example: `curl -X GET "https://api.aitraderglobal.com/v1/signals/ema?symbol=BTCUSDT" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "signal": "bullish",
    "ema9": 43250.50,
    "ema21": 42980.30,
    "confidence": 85
  }
}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Code className="h-8 w-8 text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              API Documentation
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Access
              </CardTitle>
              <CardDescription>
                Enterprise feature - Direct API access to all trading functions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey || 'Generate your API key below'}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => apiKey && copyToClipboard(apiKey)}
                    disabled={!apiKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={generateApiKey} className="w-full">
                <Key className="h-4 w-4 mr-2" />
                Generate New API Key
              </Button>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  ⚠️ Keep your API key secure. Never share it publicly or commit it to version control.
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="endpoints" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="endpoints">
                <Terminal className="h-4 w-4 mr-2" />
                Endpoints
              </TabsTrigger>
              <TabsTrigger value="authentication">
                <Key className="h-4 w-4 mr-2" />
                Authentication
              </TabsTrigger>
              <TabsTrigger value="examples">
                <Book className="h-4 w-4 mr-2" />
                Code Examples
              </TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Endpoints</CardTitle>
                  <CardDescription>
                    RESTful API endpoints for trading operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {endpoints.map((endpoint, idx) => (
                    <div key={idx} className="space-y-3 pb-6 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={endpoint.method === 'GET' ? 'default' : 'secondary'}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Request Example</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.example)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                          <code>{endpoint.example}</code>
                        </pre>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Response Example</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.response)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                          <code>{endpoint.response}</code>
                        </pre>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="authentication" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>How to authenticate your API requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Bearer Token Authentication</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Include your API key in the Authorization header of every request:
                    </p>
                    <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
                      <code>Authorization: Bearer YOUR_API_KEY</code>
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Rate Limits</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 100 requests per minute for GET endpoints</li>
                      <li>• 20 requests per minute for POST/PUT/DELETE endpoints</li>
                      <li>• Rate limit headers included in every response</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Error Codes</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">401</Badge>
                        <span className="text-muted-foreground">Invalid or missing API key</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">429</Badge>
                        <span className="text-muted-foreground">Rate limit exceeded</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">500</Badge>
                        <span className="text-muted-foreground">Server error</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Code Examples</CardTitle>
                  <CardDescription>Integration examples in popular languages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Python</h3>
                    <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
                      <code>{`import requests

API_KEY = "your_api_key_here"
BASE_URL = "https://api.aitraderglobal.com/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get balance
response = requests.get(f"{BASE_URL}/account/balance", headers=headers)
print(response.json())

# Open position
data = {
    "exchange": "binance",
    "symbol": "BTCUSDT",
    "side": "long",
    "amount": 100,
    "leverage": 10
}
response = requests.post(f"{BASE_URL}/trade/open", headers=headers, json=data)
print(response.json())`}</code>
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">JavaScript / Node.js</h3>
                    <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
                      <code>{`const axios = require('axios');

const API_KEY = 'your_api_key_here';
const BASE_URL = 'https://api.aitraderglobal.com/v1';

const headers = {
  'Authorization': \`Bearer \${API_KEY}\`,
  'Content-Type': 'application/json'
};

// Get balance
axios.get(\`\${BASE_URL}/account/balance\`, { headers })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Open position
const tradeData = {
  exchange: 'binance',
  symbol: 'BTCUSDT',
  side: 'long',
  amount: 100,
  leverage: 10
};

axios.post(\`\${BASE_URL}/trade/open\`, tradeData, { headers })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ApiDocs;
