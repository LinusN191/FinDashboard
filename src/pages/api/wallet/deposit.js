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
    console.log('Firebase Admin SDK initialized for /wallet/deposit route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /wallet/deposit route:', error.stack);
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
  if (!uid) return; // verifyToken already sent response

  try {
    const { amount, currency } = req.body;

    // Validate input
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Bad Request: "amount" must be a positive integer (cents).' });
    }
    if (!currency || typeof currency !== 'string') { // For V1, we might just enforce 'USD'
      return res.status(400).json({ error: 'Bad Request: "currency" must be a string (e.g., "USD").' });
    }
    if (currency !== 'USD') { // V1 constraint
        return res.status(400).json({ error: 'Bad Request: Only "USD" currency is supported in V1.' });
    }


    const walletRef = db.collection('userWallets').doc(uid);
    const newTransactionRef = walletRef.collection('transactions').doc(); // Auto-generate ID

    const transactionResult = await db.runTransaction(async (t) => {
      const walletDoc = await t.get(walletRef);
      let currentBalance = 0;
      let walletCurrency = 'USD'; // Default for new wallet

      if (!walletDoc.exists) {
        console.log(`Wallet not found for user ${uid}, creating new one.`);
        const newWalletData = {
          userId: uid,
          balance: 0, // Stored as cents
          currency: 'USD',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        t.set(walletRef, newWalletData);
        // currentBalance and walletCurrency are already set to defaults
      } else {
        const walletData = walletDoc.data();
        currentBalance = walletData.balance;
        walletCurrency = walletData.currency;
        if (walletCurrency !== currency) {
          // This check should ideally be outside the transaction if we want to prevent creating a wallet
          // with a mismatched currency for an existing wallet. But for deposit, creating one is fine.
          // However, if the wallet EXISTS, its currency must match.
          throw new Error('Currency mismatch: Transaction currency does not match wallet currency.');
        }
      }
      
      const newBalance = currentBalance + amount;

      const transactionData = {
        type: 'DEPOSIT',
        status: 'COMPLETED', // Mocked as always completed for V1
        amount: amount,
        currency: currency,
        transactionDate: admin.firestore.FieldValue.serverTimestamp(), // Actual time of transaction
        processedDate: admin.firestore.FieldValue.serverTimestamp(), // Mocked as same for V1
        description: 'Mock deposit via API V1',
        userId: uid, // For subcollection queries if needed, though parent doc implies it
        walletId: walletRef.id, // which is uid
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      t.set(newTransactionRef, transactionData);
      t.update(walletRef, { 
        balance: newBalance, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });

      return { id: newTransactionRef.id, ...transactionData }; // Return data for response
    });
    
    // Convert Timestamps in transactionResult to ISO strings for the response
    const responseData = {
        ...transactionResult,
        transactionDate: transactionResult.transactionDate ? new Date().toISOString() : null, // Approximate with current time as serverTimestamp is not resolved yet client-side
        processedDate: transactionResult.processedDate ? new Date().toISOString() : null,
        createdAt: transactionResult.createdAt ? new Date().toISOString() : null,
        updatedAt: transactionResult.updatedAt ? new Date().toISOString() : null,
    };


    res.status(201).json(responseData);

  } catch (error) {
    console.error(`Error processing deposit for user ${uid}:`, error);
    if (error.message.startsWith('Currency mismatch')) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error: Could not process deposit.' });
  }
}
