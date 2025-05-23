import admin from 'firebase-admin';
import axios from 'axios';

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
    console.log('Firebase Admin SDK initialized for historical-price route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in historical-price route:', error.stack);
  }
}

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

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
  const uid = await verifyToken(req, res);
  if (!uid) return; // verifyToken already sent response

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { assetApiId, apiSource, days = '30' } = req.query; // Default to 30 days

  if (!assetApiId || !apiSource) {
    return res.status(400).json({ error: 'Bad Request: Missing assetApiId or apiSource query parameter.' });
  }

  const numDays = parseInt(days, 10);
  if (isNaN(numDays) || numDays <= 0) {
    return res.status(400).json({ error: 'Bad Request: Invalid "days" parameter. Must be a positive integer.' });
  }

  try {
    let historicalData = [];

    if (apiSource === 'coingecko') {
      const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/${assetApiId}/market_chart?vs_currency=usd&days=${numDays}&interval=daily`;
      const response = await axios.get(coingeckoUrl);
      if (response.data && response.data.prices) {
        historicalData = response.data.prices.map(pricePoint => ({
          time: pricePoint[0] / 1000, // Convert ms to seconds for lightweight-charts
          value: pricePoint[1],
        }));
      } else {
        throw new Error('Invalid data format from CoinGecko');
      }
    } else if (apiSource === 'finnhub') {
      if (!FINNHUB_API_KEY) {
        return res.status(500).json({ error: 'Finnhub API key not configured on server.' });
      }
      // Finnhub requires date range in UNIX timestamps (seconds)
      const toTimestamp = Math.floor(Date.now() / 1000);
      const fromTimestamp = toTimestamp - (numDays * 24 * 60 * 60);
      
      const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${assetApiId}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${FINNHUB_API_KEY}`;
      const response = await axios.get(finnhubUrl);

      if (response.data && response.data.s === 'ok') {
        // Ensure all arrays have the same length before mapping
        const { t, c } = response.data; // t: timestamps, c: closing prices
        if (t && c && t.length === c.length) {
            historicalData = t.map((timestamp, index) => ({
                time: timestamp, // Finnhub provides timestamps in seconds
                value: c[index],
            }));
        } else {
             // If no data, t and c might be undefined or have 0 length.
            if (t && t.length === 0) { // No data returned is not an error for Finnhub
                historicalData = [];
            } else {
                console.warn(`Finnhub data mismatch for ${assetApiId}: timestamps length ${t?.length}, closes length ${c?.length}`);
                throw new Error('Data mismatch or missing data from Finnhub');
            }
        }
      } else if (response.data && response.data.s === 'no_data') {
        historicalData = []; // No data is a valid response
      } else {
        console.error('Finnhub API error response:', response.data);
        throw new Error(`Failed to fetch data from Finnhub: ${response.data.s || 'Unknown error'}`);
      }
    } else {
      return res.status(400).json({ error: 'Bad Request: Unsupported apiSource.' });
    }

    res.status(200).json(historicalData);

  } catch (error) {
    console.error(`Error fetching historical data for ${assetApiId} from ${apiSource}:`, error.message);
    if (error.response) { // Error from external API
      return res.status(error.response.status || 500).json({ 
        error: `External API Error (${apiSource}): ${error.response.data?.error || error.message}` 
      });
    }
    return res.status(500).json({ error: `Internal Server Error: Could not fetch historical price data. ${error.message}` });
  }
}
