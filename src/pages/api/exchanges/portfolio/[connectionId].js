import admin from 'firebase-admin';
import { decrypt } from '../../../../utils/encryption'; // Adjust path as needed
import Binance from 'binance-api-node';
import axios from 'axios'; // For fetching current prices

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
    console.log('Firebase Admin SDK initialized for /exchanges/portfolio/[connectionId] route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
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

// Helper to get a more common name for a crypto symbol
const getAssetName = (symbol) => {
    // This can be expanded with a more comprehensive mapping
    const map = {
        BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'Binance Coin', ADA: 'Cardano',
        XRP: 'XRP', DOGE: 'Dogecoin', DOT: 'Polkadot', LTC: 'Litecoin',
        LINK: 'Chainlink', XLM: 'Stellar', USDT: 'Tether', USDC: 'USD Coin',
        // Add more as needed
    };
    return map[symbol.toUpperCase()] || symbol.toUpperCase();
};


// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return;

  const { connectionId } = req.query;
  if (!connectionId || typeof connectionId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Missing or invalid connectionId.' });
  }

  try {
    // 3. Fetch Connection Details & Decrypt Keys
    const connectionRef = db.collection('userExchangeConnections').doc(connectionId);
    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
      return res.status(404).json({ error: 'Not Found: Exchange connection not found.' });
    }

    const connectionData = connectionDoc.data();
    if (connectionData.userId !== uid) {
      console.warn(`Unauthorized portfolio access attempt: user ${uid} for connection ${connectionId} owned by ${connectionData.userId}`);
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access this exchange connection.' });
    }

    if (connectionData.status !== 'active') {
      return res.status(400).json({ error: `Bad Request: Connection status is "${connectionData.status}". Expected "active".` });
    }
    if (connectionData.exchangeName.toLowerCase() !== 'binance') {
        return res.status(400).json({ error: 'Bad Request: This route currently only supports Binance connections (V1).' });
    }

    let apiKey, apiSecret;
    try {
      apiKey = decrypt(connectionData.encryptedApiKey);
      apiSecret = decrypt(connectionData.encryptedApiSecret);
    } catch (decryptionError) {
      console.error(`Decryption failed for connection ${connectionId}:`, decryptionError);
      return res.status(500).json({ error: 'Internal Server Error: Could not decrypt API keys.' });
    }
    
    if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: 'Internal Server Error: Decrypted keys are invalid.'})
    }

    // 4. Interact with Exchange API (Binance V1)
    const binanceClient = Binance({ apiKey, apiSecret });
    const accountInfo = await binanceClient.accountInfo(); // Fetches balances for all assets

    const exchangePortfolio = [];
    const symbolsToFetchPrice = [];

    if (accountInfo && accountInfo.balances) {
      for (const balance of accountInfo.balances) {
        const quantity = parseFloat(balance.free) + parseFloat(balance.locked);
        if (quantity > 0) { // Only include assets with a positive balance
          exchangePortfolio.push({
            source: connectionData.exchangeName,
            sourceAssetId: `${balance.asset}_${connectionData.exchangeName}_spot`, // e.g., BTC_binance_spot
            assetType: 'CRYPTO', // Assuming all Binance spot assets are crypto for now
            symbol: balance.asset,
            name: getAssetName(balance.asset), 
            quantity: quantity,
            currentValue: null, // To be filled by price fetching
            lastPriceUpdate: null,
          });
          // Collect symbols for batch price fetching, only if not a stablecoin we already know value of
          if (balance.asset !== 'USDT' && balance.asset !== 'USDC' && balance.asset !== 'BUSD' && balance.asset !== 'DAI' && balance.asset !== 'TUSD') {
             symbolsToFetchPrice.push(balance.asset + 'USDT'); // Assuming USDT pairing for price
          }
        }
      }
    }
    
    // Fetch current prices for non-stablecoin assets
    if (symbolsToFetchPrice.length > 0) {
        try {
            // Binance API allows fetching multiple tickers in one call for prices
            // However, binance-api-node's prices() might not support array directly.
            // We can use axios for this or iterate. For simplicity with binance-api-node:
            const prices = await binanceClient.prices(); // Fetches all prices

            exchangePortfolio.forEach(asset => {
                const pairSymbol = asset.symbol + 'USDT';
                if (prices[pairSymbol]) {
                    asset.currentValue = parseFloat(prices[pairSymbol]) * asset.quantity;
                    asset.lastPriceUpdate = new Date().toISOString();
                } else if (asset.symbol === 'USDT' || asset.symbol === 'USDC' || asset.symbol === 'BUSD' || asset.symbol === 'DAI' || asset.symbol === 'TUSD') {
                    // For stablecoins pegged to USD, value is quantity itself (approx)
                    asset.currentValue = asset.quantity; 
                    asset.lastPriceUpdate = new Date().toISOString();
                }
                // If price for a non-stablecoin isn't found, currentValue remains null
            });
        } catch (priceError) {
            console.warn(`Could not fetch some prices from Binance for connection ${connectionId}:`, priceError.message);
            // Continue without prices for those assets, or mark them as price fetch failed.
        }
    } else {
        // Handle stablecoins if they were the only assets
         exchangePortfolio.forEach(asset => {
            if (asset.symbol === 'USDT' || asset.symbol === 'USDC' || asset.symbol === 'BUSD' || asset.symbol === 'DAI' || asset.symbol === 'TUSD') {
                asset.currentValue = asset.quantity; 
                asset.lastPriceUpdate = new Date().toISOString();
            }
        });
    }


    res.status(200).json({ success: true, exchangePortfolio });

  } catch (error) {
    console.error(`Error fetching portfolio for connection ${connectionId}, user ${uid}:`, error);
    if (error.code && error.message) { // Binance API errors often have a code
        // e.g. -1022 signature, -2015 invalid api key/secret, -2014 invalid api key format
        if (error.code === -2015 || error.code === -2014 || error.message.toLowerCase().includes('invalid api key')) {
            return res.status(400).json({ error: 'Exchange API Error: Invalid API Key or Secret. Please check and reconnect.' });
        } else if (error.message.toLowerCase().includes('permissions')) {
            return res.status(400).json({ error: 'Exchange API Error: API keys lack necessary permissions (e.g., read access to balances).' });
        }
         return res.status(502).json({ error: `Exchange API Error: ${error.message} (Code: ${error.code})` });
    }
    res.status(500).json({ error: 'Internal Server Error: Could not retrieve exchange portfolio data.' });
  }
}
