import admin from 'firebase-admin';
import { encrypt } from '../../../utils/encryption'; // Assuming this path is correct
import Binance from 'binance-api-node';

// --- Firebase Admin SDK Configuration ---
const firebaseAdminConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  }),
};

if (!admin.apps.length) {
  try {
    admin.initializeApp(firebaseAdminConfig);
    console.log('Firebase Admin SDK initialized for /exchanges/connect route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /exchanges/connect route:', error.stack);
  }
}

const db = admin.firestore();

// --- Authentication Helper ---
async function verifyToken(req, res) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
    return null;
  }
  const idToken = authorizationHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token.' });
    return null;
  }
}

// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return;

  try {
    const { exchangeName, apiKey, apiSecret, canTrade = false } = req.body; // Added canTrade

    // 1. Validate Inputs
    if (!exchangeName || typeof exchangeName !== 'string' || exchangeName.trim() === '') {
      return res.status(400).json({ error: 'Bad Request: "exchangeName" must be a non-empty string.' });
    }
    if (exchangeName.toLowerCase() !== 'binance') { // V1: Only Binance supported
      return res.status(400).json({ error: 'Bad Request: Only "binance" is supported as an exchange in V1.' });
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      return res.status(400).json({ error: 'Bad Request: "apiKey" must be a non-empty string.' });
    }
    if (!apiSecret || typeof apiSecret !== 'string' || apiSecret.trim() === '') {
      return res.status(400).json({ error: 'Bad Request: "apiSecret" must be a non-empty string.' });
    }
    if (typeof canTrade !== 'boolean') {
        return res.status(400).json({ error: 'Bad Request: "canTrade" must be a boolean value.' });
    }


    // 2. Test Connection with Binance
    let accountInfo;
    try {
      const binanceClient = Binance({
        apiKey: apiKey,
        apiSecret: apiSecret,
      });
      
      // Basic read-only call to test general connectivity and key validity
      accountInfo = await binanceClient.accountInfo(); 
      console.log(`Binance API key basic test successful for user ${uid}. Account type: ${accountInfo.accountType}`);

      if (canTrade) {
        // If user claims trading is enabled, perform an additional check.
        // Fetching trade fees for a common pair is a lightweight way to check if trading-related endpoints are accessible.
        // This doesn't guarantee SPOT/MARGIN trading is enabled, but it's a step towards verifying.
        // A more definitive check would be `accountInfo.canTrade` if the library/API version supports it directly in accountInfo.
        // Binance accountInfo response has `canTrade`, `canWithdraw`, `canDeposit` booleans.
        if (!accountInfo.canTrade) {
             console.warn(`Binance API key test for user ${uid}: Trading permissions requested but accountInfo.canTrade is false.`);
             return res.status(400).json({ error: 'API Key does not have trading permissions according to Binance. Please enable trading for this key on the Binance platform or uncheck the "Trading Enabled" option.' });
        }
        // As an additional check, trying to fetch trade fees.
        // This might fail if the key is restricted from accessing specific symbols or if the symbol doesn't exist.
        // For V1, we'll rely primarily on accountInfo.canTrade.
        // await binanceClient.tradeFee({ symbol: 'BTCUSDT' }); // Example call
        console.log(`Binance API key trading permission check passed (accountInfo.canTrade is true) for user ${uid}.`);
      }

    } catch (binanceError) {
      console.warn(`Binance API key test failed for user ${uid}:`, binanceError.message, binanceError.code);
      if (binanceError.code === -1022 || binanceError.message.includes('Signature for this request is not valid')) {
        return res.status(400).json({ error: 'Invalid API Key or Secret (Signature Error). Please check your keys and try again.' });
      }
      if (binanceError.code === -2014 || binanceError.message.includes('API-key format invalid')) {
        return res.status(400).json({ error: 'API Key format is invalid.' });
      }
      if (binanceError.code === -2015) { // Invalid API-key, IP, or permissions for action
        return res.status(400).json({ error: 'Invalid API Key or Secret, or key does not have sufficient permissions for basic info retrieval. Please check your key settings on Binance.' });
      }
      // Generic fallback for other Binance errors
      return res.status(400).json({ error: `Failed to connect to Binance with the provided keys. Binance Error: ${binanceError.message} (Code: ${binanceError.code || 'N/A'})` });
    }

    // 3. Encrypt API Key and Secret
    let encryptedApiKey;
    let encryptedApiSecret;
    try {
      encryptedApiKey = encrypt(apiKey);
      encryptedApiSecret = encrypt(apiSecret);
    } catch (encryptionError) {
      console.error('Encryption failed during exchange connect:', encryptionError);
      return res.status(500).json({ error: 'Internal Server Error: Could not secure API keys.' });
    }
    if (!encryptedApiKey || !encryptedApiSecret) {
        return res.status(500).json({ error: 'Internal Server Error: API key encryption resulted in null values.'})
    }

    // 4. Save to Firestore
    const connectionRef = db.collection('userExchangeConnections').doc();
    const apiKeyPublicPart = `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`;

    const newConnectionData = {
      userId: uid,
      exchangeName: exchangeName.toLowerCase(),
      encryptedApiKey,
      encryptedApiSecret,
      apiKeyPublicPart,
      permissions: canTrade ? ['read_only', 'trade'] : ['read_only'], // Set permissions based on canTrade
      canTrade: canTrade, // Store the canTrade flag
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await connectionRef.set(newConnectionData);
    console.log(`New exchange connection created for user ${uid}, docId: ${connectionRef.id}, canTrade: ${canTrade}`);

    // 5. Return Success Response (Non-sensitive data)
    res.status(201).json({
      id: connectionRef.id,
      exchangeName: newConnectionData.exchangeName,
      status: newConnectionData.status,
      apiKeyPublicPart: newConnectionData.apiKeyPublicPart,
      canTrade: newConnectionData.canTrade, // Include canTrade in response
    });

  } catch (error) {
    console.error(`Error connecting exchange for user ${uid}:`, error);
    res.status(500).json({ error: 'Internal Server Error: Could not connect exchange.' });
  }
}
