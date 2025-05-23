import admin from 'firebase-admin';

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
    console.log('Firebase Admin SDK initialized successfully for [assetId] route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in [assetId] route:', error.stack);
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
  const uid = await verifyToken(req, res);
  if (!uid) {
    // verifyToken already sent a response
    return;
  }

  if (req.method === 'GET') {
    const { assetId } = req.query;

    if (!assetId) {
      return res.status(400).json({ error: 'Bad Request: Missing assetId in query parameter.' });
    }

    try {
      const assetRef = db.collection('userInvestments').doc(assetId);
      const assetDoc = await assetRef.get();

      if (!assetDoc.exists) {
        return res.status(404).json({ error: 'Not Found: Asset not found.' });
      }

      const assetData = assetDoc.data();

      // Authorization: Check if the fetched asset belongs to the authenticated user
      if (assetData.userId !== uid) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to access this asset.' });
      }

      // Convert Firestore Timestamps to ISO strings for JSON response
      const formattedAssetData = {
        id: assetDoc.id,
        ...assetData,
        purchaseDate: assetData.purchaseDate ? assetData.purchaseDate.toDate().toISOString().split('T')[0] : null, // YYYY-MM-DD
        createdAt: assetData.createdAt ? assetData.createdAt.toDate().toISOString() : null,
        updatedAt: assetData.updatedAt ? assetData.updatedAt.toDate().toISOString() : null,
        lastPriceUpdate: assetData.lastPriceUpdate ? assetData.lastPriceUpdate.toDate().toISOString() : null,
        // Conditionally format other date fields if they exist (e.g., for BOND, ALTERNATIVE)
        maturityDate: assetData.maturityDate ? assetData.maturityDate.toDate().toISOString().split('T')[0] : null,
        valuationDate: assetData.valuationDate ? assetData.valuationDate.toDate().toISOString().split('T')[0] : null,
      };
      
      // Remove undefined fields that resulted from conditional formatting if original date was null
      Object.keys(formattedAssetData).forEach(key => {
        if (formattedAssetData[key] === null && (key === 'maturityDate' || key === 'valuationDate') && !assetData[key]) {
          delete formattedAssetData[key];
        }
      });


      res.status(200).json(formattedAssetData);

    } catch (error) {
      console.error(`Error fetching asset ${assetId}:`, error);
      res.status(500).json({ error: `Internal Server Error: Could not fetch asset ${assetId}.` });
    }
  } else {
    // Method Not Allowed
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
