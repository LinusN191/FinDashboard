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
    console.log('Firebase Admin SDK initialized for /exchanges/disconnect route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /exchanges/disconnect route:', error.stack);
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
    const { connectionId } = req.body;

    // 1. Validate Input
    if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
      return res.status(400).json({ error: 'Bad Request: "connectionId" must be a non-empty string.' });
    }

    // 2. Fetch and Authorize
    const connectionRef = db.collection('userExchangeConnections').doc(connectionId);
    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
      return res.status(404).json({ error: 'Not Found: Connection not found.' });
    }

    const connectionData = connectionDoc.data();
    if (connectionData.userId !== uid) {
      // Log this attempt for security monitoring
      console.warn(`Unauthorized attempt to delete connection ${connectionId} by user ${uid}. Owner is ${connectionData.userId}.`);
      return res.status(403).json({ error: 'Forbidden: You do not have permission to disconnect this exchange connection.' });
    }

    // 3. Delete Document
    await connectionRef.delete();
    console.log(`Exchange connection ${connectionId} deleted successfully for user ${uid}.`);

    // 4. Return Success Response
    res.status(200).json({ success: true, message: 'Exchange connection disconnected successfully.' });

  } catch (error) {
    console.error(`Error disconnecting exchange for user ${uid}, connectionId ${req.body?.connectionId}:`, error);
    res.status(500).json({ error: 'Internal Server Error: Could not disconnect exchange connection.' });
  }
}
