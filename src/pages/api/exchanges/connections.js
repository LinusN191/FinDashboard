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
    console.log('Firebase Admin SDK initialized for /exchanges/connections route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /exchanges/connections route:', error.stack);
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return;

  try {
    const connectionsSnapshot = await db.collection('userExchangeConnections')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc') // Optional: order by creation time
      .get();

    if (connectionsSnapshot.empty) {
      return res.status(200).json([]);
    }

    const connections = connectionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        exchangeName: data.exchangeName,
        status: data.status,
        apiKeyPublicPart: data.apiKeyPublicPart || null, // Include if available
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        // Do NOT include encryptedApiKey or encryptedApiSecret
      };
    });

    res.status(200).json(connections);

  } catch (error) {
    console.error(`Error fetching exchange connections for user ${uid}:`, error);
    res.status(500).json({ error: 'Internal Server Error: Could not retrieve exchange connections.' });
  }
}
