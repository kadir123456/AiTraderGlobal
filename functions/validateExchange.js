/**
 * Firebase Cloud Function: Validate Exchange API Credentials
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Init functions: firebase init functions
 * 4. Copy this file to functions/ directory
 * 5. Install dependencies in functions/: npm install crypto axios
 * 6. Set encryption key: firebase functions:config:set encryption.key="YOUR_32_CHAR_ENCRYPTION_KEY"
 * 7. Deploy: firebase deploy --only functions:validateExchange
 * 
 * This function:
 * - Validates exchange API credentials
 * - Encrypts and stores API keys securely
 * - Returns exchange connection status
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();

// Encryption functions
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = functions.config().encryption?.key || process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('ENCRYPTION_KEY must be exactly 32 characters');
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Exchange API validation
async function validateBinance(apiKey, apiSecret) {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');

    const response = await axios.get('https://api.binance.com/api/v3/account', {
      headers: { 'X-MBX-APIKEY': apiKey },
      params: { timestamp, signature },
      timeout: 10000,
    });

    return { valid: true, data: response.data };
  } catch (error) {
    console.error('Binance validation error:', error.response?.data || error.message);
    return { valid: false, error: error.response?.data?.msg || 'Invalid API credentials' };
  }
}

async function validateBybit(apiKey, apiSecret) {
  try {
    const timestamp = Date.now();
    const params = { api_key: apiKey, timestamp };
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');

    const response = await axios.get('https://api.bybit.com/v2/private/wallet/balance', {
      params: { ...params, sign: signature },
      timeout: 10000,
    });

    return { valid: response.data.ret_code === 0, data: response.data };
  } catch (error) {
    console.error('Bybit validation error:', error.response?.data || error.message);
    return { valid: false, error: 'Invalid API credentials' };
  }
}

async function validateOKX(apiKey, apiSecret) {
  try {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const requestPath = '/api/v5/account/balance';
    const prehash = timestamp + method + requestPath;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(prehash)
      .digest('base64');

    const response = await axios.get(`https://www.okx.com${requestPath}`, {
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': '', // User should provide if they set one
      },
      timeout: 10000,
    });

    return { valid: response.data.code === '0', data: response.data };
  } catch (error) {
    console.error('OKX validation error:', error.response?.data || error.message);
    return { valid: false, error: 'Invalid API credentials' };
  }
}

exports.validateExchange = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, exchange, apiKey, apiSecret } = req.body;

  if (!userId || !exchange || !apiKey || !apiSecret) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    // Validate credentials with exchange
    let validationResult;
    switch (exchange.toLowerCase()) {
      case 'binance':
        validationResult = await validateBinance(apiKey, apiSecret);
        break;
      case 'bybit':
        validationResult = await validateBybit(apiKey, apiSecret);
        break;
      case 'okx':
        validationResult = await validateOKX(apiKey, apiSecret);
        break;
      default:
        res.status(400).json({ error: 'Unsupported exchange' });
        return;
    }

    if (!validationResult.valid) {
      res.status(400).json({ 
        error: 'Invalid API credentials', 
        details: validationResult.error 
      });
      return;
    }

    // Encrypt and store credentials
    const exchangeId = `${exchange}_${Date.now()}`;
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    await db.ref(`secure_keys/${userId}/${exchangeId}`).set({
      exchange,
      apiKey: encryptedKey,
      apiSecret: encryptedSecret,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log(`Exchange ${exchange} validated and stored for user ${userId}`);

    res.status(200).json({
      exchangeId,
      status: 'connected',
      message: 'Exchange connected successfully',
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
