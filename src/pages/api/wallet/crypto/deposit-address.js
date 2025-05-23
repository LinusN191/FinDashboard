import admin from 'firebase-admin';
import { ethers } from 'ethers'; // HD Wallet library

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
    console.log('Firebase Admin SDK initialized for /crypto/deposit-address route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

const db = admin.firestore();

// --- Master Mnemonic Configuration ---
const MASTER_WALLET_MNEMONIC = process.env.MASTER_WALLET_MNEMONIC;
if (!MASTER_WALLET_MNEMONIC) {
  console.error("CRITICAL: MASTER_WALLET_MNEMONIC environment variable is not set. Crypto address generation will fail.");
}

// --- Supported Currencies (V1) ---
const SUPPORTED_CRYPTO_CURRENCIES = ['USDC_POLYGON', 'USDT_POLYGON']; // Add more as needed

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

// --- Atomic Counter for User Index ---
const getNextUserIndex = async () => {
  const counterRef = db.collection('platformSettings').doc('hdWalletCounter');
  try {
    const newIndex = await db.runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      let nextIndex = 0;
      if (doc.exists) {
        nextIndex = (doc.data().currentIndex || 0) + 1;
      }
      t.set(counterRef, { currentIndex: nextIndex }, { merge: true }); // Use set with merge for creation or update
      return nextIndex;
    });
    return newIndex;
  } catch (error) {
    console.error("Error incrementing userIndex for HD Wallet:", error);
    throw new Error("Failed to get next user index for address generation.");
  }
};


// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!MASTER_WALLET_MNEMONIC) {
    console.error('Master wallet mnemonic not configured. Cannot generate deposit addresses.');
    return res.status(500).json({ error: 'Service not configured: Master wallet mnemonic is missing.' });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return; // verifyToken already sent response

  try {
    // 2. Request Query Validation
    const { currency } = req.query;
    if (!currency || typeof currency !== 'string') {
      return res.status(400).json({ error: 'Bad Request: "currency" query parameter is required.' });
    }
    if (!SUPPORTED_CRYPTO_CURRENCIES.includes(currency.toUpperCase())) {
      return res.status(400).json({ error: `Bad Request: Currency "${currency}" is not supported. Supported: ${SUPPORTED_CRYPTO_CURRENCIES.join(', ')}` });
    }
    const validatedCurrencySymbol = currency.toUpperCase();

    // 3. Check for Existing Active Address
    const addressesRef = db.collection('userCryptoAddresses');
    const existingQuery = await addressesRef
      .where('userId', '==', uid)
      .where('currency', '==', validatedCurrencySymbol)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0].data();
      console.log(`Returning existing active address for user ${uid}, currency ${validatedCurrencySymbol}: ${existingDoc.address}`);
      return res.status(200).json({ success: true, currency: existingDoc.currency, address: existingDoc.address });
    }

    // 4. Generate New Address (if none exists or none active)
    const userIndex = await getNextUserIndex();
    const derivationPath = `m/44'/60'/0'/0/${userIndex}`; // Standard BIP44 path for Ethereum-like chains

    let newGeneratedAddress;
    try {
      const masterNode = ethers.utils.HDNode.fromMnemonic(MASTER_WALLET_MNEMONIC);
      const childNode = masterNode.derivePath(derivationPath);
      newGeneratedAddress = childNode.address;
    } catch (hdError) {
      console.error(`HD Wallet address derivation failed for user ${uid}, index ${userIndex}:`, hdError);
      return res.status(500).json({ error: 'Internal Server Error: Could not generate new address due to HD wallet error.' });
    }

    if (!newGeneratedAddress) {
        return res.status(500).json({ error: 'Internal Server Error: Failed to derive a valid address.' });
    }

    // 5. Store Address Details in Firestore
    const newAddressDocRef = addressesRef.doc(); // Auto-generate ID for the new address document
    const newAddressData = {
      userId: uid,
      currency: validatedCurrencySymbol,
      address: newGeneratedAddress,
      derivationPath: derivationPath,
      userIndex: userIndex,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await newAddressDocRef.set(newAddressData);
    console.log(`New deposit address ${newGeneratedAddress} generated and stored for user ${uid}, currency ${validatedCurrencySymbol}, index ${userIndex}`);

    // 6. Response
    res.status(200).json({ success: true, currency: validatedCurrencySymbol, address: newGeneratedAddress });

  } catch (error) {
    console.error(`Error in crypto deposit-address for user ${uid}:`, error);
    if (error.message.startsWith("Failed to get next user index")) {
        return res.status(500).json({ error: 'Internal Server Error: Could not generate address due to indexer failure.' });
    }
    res.status(500).json({ error: 'Internal Server Error: Could not process request for deposit address.' });
  }
}
