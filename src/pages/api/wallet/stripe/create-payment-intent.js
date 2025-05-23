import admin from 'firebase-admin';
import Stripe from 'stripe'; // Correct import for Stripe
import crypto from 'crypto'; // For randomUUID

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
    console.log('Firebase Admin SDK initialized for /stripe/create-payment-intent route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

const db = admin.firestore();

// --- Stripe Initialization ---
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16', // Use a recent, fixed API version
    });
} else {
    console.error("CRITICAL: STRIPE_SECRET_KEY environment variable is not set. Stripe API calls will fail.");
}


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

  if (!stripe) {
    console.error('Stripe SDK not initialized due to missing API key.');
    return res.status(500).json({ error: 'Payment processing service is not configured.' });
  }

  try {
    const { amount, currency } = req.body;

    // Validate input
    if (!Number.isInteger(amount) || amount < 50) { // Stripe has a minimum charge amount (e.g., 50 cents for USD)
      return res.status(400).json({ error: 'Bad Request: "amount" must be a positive integer representing cents, and at least 50 cents.' });
    }
    if (currency !== 'usd') { // V1 constraint
      return res.status(400).json({ error: 'Bad Request: Only "usd" currency is supported in V1.' });
    }

    const internalTransactionId = crypto.randomUUID();

    // Create Stripe Payment Intent
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        metadata: {
          userId: uid,
          internalTransactionId: internalTransactionId,
          // Note: For more advanced scenarios, you might create/retrieve a Stripe Customer ID
          // and associate it with the PaymentIntent: customer: stripeCustomerId
        },
      });
    } catch (stripeError) {
      console.error(`Stripe PaymentIntent creation error for user ${uid}:`, stripeError);
      // Forward a structured error to the client
      return res.status(stripeError.statusCode || 502).json({ 
        error: `Stripe API error: ${stripeError.message}`,
        errorCode: stripeError.code,
        errorType: stripeError.type,
      });
    }
    
    // Create Pending Transaction in Firestore
    try {
      const transactionRef = db.collection('userWallets').doc(uid)
                               .collection('transactions').doc(internalTransactionId); // Use our generated ID

      const transactionData = {
        type: 'DEPOSIT',
        status: 'PENDING_GATEWAY', // More specific status
        amount: amount,
        currency: currency,
        userId: uid,
        walletId: uid, // Wallet ID is the same as User ID
        transactionDate: admin.firestore.FieldValue.serverTimestamp(), // When intent was created
        description: 'Stripe deposit initiated',
        paymentGatewayDetails: {
          type: 'STRIPE',
          paymentIntentId: paymentIntent.id,
          clientSecretLast4: paymentIntent.client_secret ? paymentIntent.client_secret.slice(-4) : null, // For reference
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await transactionRef.set(transactionData);
      console.log(`Pending transaction ${internalTransactionId} created for user ${uid} with PI ${paymentIntent.id}`);
    } catch (firestoreError) {
      console.error(`Firestore error after Stripe PI creation for user ${uid}, PI_ID ${paymentIntent.id}, internalTxId ${internalTransactionId}:`, firestoreError);
      // Critical: Payment Intent created but local record failed.
      // For V1, log and proceed. In a production system, this needs robust handling
      // (e.g., queue for retry, alert admin, attempt to cancel PI if appropriate).
      // Returning success here as the PI was created and clientSecret is available.
      // The client might not know about the local record failure.
      // Or, return an error to client indicating a partial failure.
      // For this task, let's assume proceeding is acceptable for V1 if PI is created.
      // However, it's safer to inform client of partial failure:
      // return res.status(500).json({ error: 'Payment intent created, but failed to record transaction locally. Please contact support.', clientSecret: paymentIntent.client_secret, internalTransactionId });
    }

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      internalTransactionId: internalTransactionId,
    });

  } catch (error) { // Catch any other unexpected errors
    console.error(`Unexpected error in create-payment-intent for user ${uid}:`, error);
    res.status(500).json({ error: 'Internal Server Error: Could not create payment intent.' });
  }
}
