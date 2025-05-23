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
    console.log('Firebase Admin SDK initialized for /wallet/transactions route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /wallet/transactions route:', error.stack);
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
    const { limit, startAfterTransactionId } = req.query;
    const parsedLimit = parseInt(limit, 10) || 10; // Default limit to 10

    if (parsedLimit <= 0 || parsedLimit > 100) { // Max limit of 100
        return res.status(400).json({ error: 'Bad Request: "limit" must be a positive integer, not exceeding 100.' });
    }

    let query = db.collection('userWallets').doc(uid).collection('transactions')
                  .orderBy('transactionDate', 'desc') // Assuming you want latest first
                  .limit(parsedLimit);

    if (startAfterTransactionId) {
      const lastDocSnapshot = await db.collection('userWallets').doc(uid)
                                    .collection('transactions').doc(startAfterTransactionId)
                                    .get();
      if (!lastDocSnapshot.exists) {
        return res.status(400).json({ error: 'Bad Request: Invalid "startAfterTransactionId". Document not found.' });
      }
      query = query.startAfter(lastDocSnapshot);
    }

    const snapshot = await query.get();
    const transactions = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        // Convert Timestamps to ISO strings
        transactionDate: data.transactionDate ? data.transactionDate.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
      });
    });

    res.status(200).json({ transactions });

  } catch (error) {
    console.error(`Error fetching wallet transactions for user ${uid}:`, error);
    if (error.message.includes("Invalid \"startAfterTransactionId\"")) { // Catch specific error if needed
        return res.status(400).json({ error: 'Bad Request: Invalid cursor for pagination.' });
    }
    res.status(500).json({ error: 'Internal Server Error: Could not retrieve wallet transactions.' });
  }
}
