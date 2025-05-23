import admin from 'firebase-admin';
import axios from 'axios'; // For making HTTP requests to external APIs

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
    console.log('Firebase Admin SDK initialized successfully for update-prices.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in update-prices:', error.stack);
  }
}

const db = admin.firestore();
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY; // Environment variable for Finnhub

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

// --- Main Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') { // This route should likely be a POST request to trigger an action
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return;

  let updatedCount = 0;
  let failedCount = 0;
  const errors = [];

  try {
    // 1. Fetch User's Assets Eligible for Update
    const assetsSnapshot = await db.collection('userInvestments')
      .where('userId', '==', uid)
      // .where('apiSource', 'in', ['coingecko', 'finnhub']) // Example: if you have such a field
      .where('assetType', 'in', ['CRYPTO', 'STOCK', 'ETF']) // Filter by relevant types
      .get();

    if (assetsSnapshot.empty) {
      return res.status(200).json({ 
        success: true, 
        message: 'No assets found for price update.', 
        details: { updatedCount, failedCount, errors } 
      });
    }

    const assetsToUpdate = [];
    assetsSnapshot.forEach(doc => {
      const asset = doc.data();
      // Ensure asset has an identifier for the external API (e.g., tickerSymbol or a dedicated apiId field)
      // For CRYPTO, we might use a field like 'coingeckoId' or 'apiId'. For STOCKS, 'tickerSymbol'.
      if ((asset.assetType === 'CRYPTO' && asset.apiId) || 
          ((asset.assetType === 'STOCK' || asset.assetType === 'ETF') && asset.tickerSymbol)) {
        assetsToUpdate.push({ id: doc.id, ...asset });
      } else {
        // Not eligible or missing identifier
      }
    });

    if (assetsToUpdate.length === 0) {
        return res.status(200).json({ 
            success: true, 
            message: 'No eligible assets found for price update (missing API identifiers).', 
            details: { updatedCount, failedCount, errors } 
        });
    }

    // 2. Separate assets by type for different API calls
    const cryptoAssets = assetsToUpdate.filter(asset => asset.assetType === 'CRYPTO');
    const stockAssets = assetsToUpdate.filter(asset => asset.assetType === 'STOCK' || asset.assetType === 'ETF');

    const priceUpdates = {}; // Store fetched prices: { assetFirestoreId: newPrice }

    // 3. Fetch Crypto Prices (CoinGecko)
    if (cryptoAssets.length > 0) {
      const cryptoApiIds = [...new Set(cryptoAssets.map(asset => asset.apiId))].join(',');
      try {
        const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoApiIds}&vs_currencies=usd`;
        const cryptoResponse = await axios.get(coingeckoUrl);
        
        cryptoAssets.forEach(asset => {
          if (cryptoResponse.data[asset.apiId] && cryptoResponse.data[asset.apiId].usd) {
            priceUpdates[asset.id] = cryptoResponse.data[asset.apiId].usd;
          } else {
            failedCount++;
            errors.push({ 
              assetId: asset.id, 
              name: asset.name, 
              type: 'CRYPTO', 
              error: `Price not found on CoinGecko for ID: ${asset.apiId}` 
            });
          }
        });
      } catch (error) {
        console.error('Error fetching from CoinGecko:', error.message);
        // Mark all crypto assets as failed for this batch if the API call itself fails
        cryptoAssets.forEach(asset => {
            if (!priceUpdates[asset.id]) { // Only if not already successfully priced (unlikely here)
                failedCount++;
                errors.push({ assetId: asset.id, name: asset.name, type: 'CRYPTO', error: `CoinGecko API request failed: ${error.message}` });
            }
        });
      }
    }

    // 4. Fetch Stock/ETF Prices (Finnhub)
    if (stockAssets.length > 0 && FINNHUB_API_KEY) {
      for (const asset of stockAssets) {
        try {
          const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${asset.tickerSymbol}&token=${FINNHUB_API_KEY}`;
          const stockResponse = await axios.get(finnhubUrl);
          
          if (stockResponse.data && stockResponse.data.c != null) { // 'c' is current price
            priceUpdates[asset.id] = stockResponse.data.c;
          } else {
            failedCount++;
            errors.push({ 
              assetId: asset.id, 
              name: asset.name, 
              type: asset.assetType, 
              error: `Price not found on Finnhub for symbol: ${asset.tickerSymbol} (Response: ${JSON.stringify(stockResponse.data)})`
            });
          }
          // Small delay to respect potential rate limits if any (Finnhub free tier is generally robust for quotes)
          await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
        } catch (error) {
          console.error(`Error fetching from Finnhub for ${asset.tickerSymbol}:`, error.message);
          failedCount++;
          errors.push({ 
            assetId: asset.id, 
            name: asset.name, 
            type: asset.assetType, 
            error: `Finnhub API request failed for ${asset.tickerSymbol}: ${error.message}` 
          });
        }
      }
    } else if (stockAssets.length > 0 && !FINNHUB_API_KEY) {
        console.warn('Finnhub API key not configured. Skipping stock price updates.');
        stockAssets.forEach(asset => {
            failedCount++;
            errors.push({ assetId: asset.id, name: asset.name, type: asset.assetType, error: 'Finnhub API key not configured.' });
        });
    }

    // 5. Update Firestore in a Batch
    if (Object.keys(priceUpdates).length > 0) {
      const batch = db.batch();
      assetsToUpdate.forEach(asset => {
        if (priceUpdates[asset.id] != null) {
          const assetRef = db.collection('userInvestments').doc(asset.id);
          const newCurrentValue = priceUpdates[asset.id] * asset.quantity;
          batch.update(assetRef, {
            currentValue: newCurrentValue,
            lastPriceUpdate: admin.firestore.FieldValue.serverTimestamp(),
          });
          updatedCount++;
        }
      });

      await batch.commit();
    }

    // 6. Response
    res.status(200).json({
      success: true,
      message: 'Investment prices update process completed.',
      details: { updatedCount, failedCount, errors },
    });

  } catch (error) {
    console.error('Error during price update process:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error: Could not complete price update process.',
      details: { updatedCount, failedCount, errors: [...errors, { generalError: error.message }] },
    });
  }
}
