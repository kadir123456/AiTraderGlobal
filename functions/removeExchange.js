/**
 * Firebase Cloud Function: Remove Exchange API Credentials
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Copy this file to functions/ directory
 * 2. Deploy: firebase deploy --only functions:removeExchange
 * 
 * This function removes encrypted API keys from secure storage
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();

exports.removeExchange = functions.https.onRequest(async (req, res) => {
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

  const { userId, exchangeId } = req.body;

  if (!userId || !exchangeId) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    // Remove encrypted keys from secure storage
    await db.ref(`secure_keys/${userId}/${exchangeId}`).remove();

    console.log(`Exchange ${exchangeId} removed for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Exchange removed successfully',
    });
  } catch (error) {
    console.error('Remove exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
