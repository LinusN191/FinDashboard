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
    console.log('Firebase Admin SDK initialized for /wallet/balance route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /wallet/balance route:', error.stack);
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
  if (!uid) return; // verifyToken already sent response

  try {
    const walletRef = db.collection('userWallets').doc(uid);
    const walletDoc = await walletRef.get();

    if (!walletDoc.exists) {
      // Wallet doesn't exist, create it
      const newWalletData = {
        userId: uid,
        balance: 0, // Stored as cents
        currency: 'USD', // Default currency
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await walletRef.set(newWalletData);
      console.log(`New wallet created for user ${uid}`);
      return res.status(200).json({ balance: newWalletData.balance, currency: newWalletData.currency });
    } else {
      // Wallet exists
      const walletData = walletDoc.data();
      return res.status(200).json({ balance: walletData.balance, currency: walletData.currency });
    }
  } catch (error) {
    console.error(`Error fetching/creating wallet balance for user ${uid}:`, error);
    res.status(500).json({ error: 'Internal Server Error: Could not retrieve wallet balance.' });
  }
}
