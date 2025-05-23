import admin from 'firebase-admin';
import Stripe from 'stripe';
import { Buffer } from 'buffer'; // For raw body processing

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
    console.log('Firebase Admin SDK initialized for /stripe/webhook route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

const db = admin.firestore();

// --- Stripe Initialization ---
let stripe;
let stripeWebhookSecret;

if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
    });
    stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
} else {
    console.error("CRITICAL: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET environment variable is not set. Stripe webhook handler will not function correctly.");
}

// --- Next.js API Configuration for Raw Body ---
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}


// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!stripe || !stripeWebhookSecret) {
    console.error('Stripe SDK or Webhook Secret not initialized due to missing environment variables.');
    return res.status(500).json({ error: 'Webhook service is not configured.' });
  }

  let event;
  let rawBody;

  try {
    rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing Stripe signature.' });
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Received Stripe event: ${event.id}, type: ${event.type}`);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      const { userId, internalTransactionId } = paymentIntentSucceeded.metadata;

      if (!userId || !internalTransactionId) {
        console.error(`Missing metadata (userId or internalTransactionId) in payment_intent.succeeded: ${paymentIntentSucceeded.id}`);
        // Return 200 to Stripe to prevent retries for this kind of error, but log it as critical.
        return res.status(200).json({ received: true, error: 'Missing required metadata.' });
      }

      try {
        const walletRef = db.collection('userWallets').doc(userId);
        const txRef = walletRef.collection('transactions').doc(internalTransactionId);

        await db.runTransaction(async (t) => {
          const txDoc = await t.get(txRef);
          const walletDoc = await t.get(walletRef); // Get wallet inside transaction for atomicity

          if (!txDoc.exists) {
              console.warn(`Transaction ${internalTransactionId} not found for payment_intent ${paymentIntentSucceeded.id}. Might be processed or an issue.`);
              // If the transaction doc isn't found, we can't mark it completed.
              // This could be an issue, or it could mean the PI was created but our local record failed.
              // For now, we'll log and acknowledge. A more robust system might create the tx record here if appropriate.
              return; // Acknowledge to Stripe
          }
          
          const txData = txDoc.data();
          if (txData.status === 'COMPLETED') {
            console.log(`Transaction ${internalTransactionId} already marked as COMPLETED. Idempotency check passed.`);
            return; // Acknowledge to Stripe
          }

          if (!walletDoc.exists) {
            // This case should be rare if deposit creates a wallet, but handle defensively
            console.error(`Wallet not found for user ${userId} during payment_intent.succeeded processing.`);
            // Don't update balance, but mark transaction as failed or requires attention
            t.update(txRef, {
              status: 'ERROR_WALLET_NOT_FOUND',
              processedDate: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              paymentGatewayDetails: admin.firestore.FieldValue.arrayUnion({
                chargeId: paymentIntentSucceeded.latest_charge,
                status: paymentIntentSucceeded.status,
                failureMessage: 'User wallet not found at time of success processing.',
              }),
            });
            return; // Acknowledge to Stripe
          }
          
          const walletData = walletDoc.data();
          const newBalance = (walletData.balance || 0) + paymentIntentSucceeded.amount_received;

          t.update(txRef, {
            status: 'COMPLETED',
            processedDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentGatewayDetails: admin.firestore.FieldValue.arrayUnion({ // Append details
                chargeId: paymentIntentSucceeded.latest_charge,
                status: paymentIntentSucceeded.status, // should be 'succeeded'
                amountReceived: paymentIntentSucceeded.amount_received,
            }),
          });

          t.update(walletRef, {
            balance: newBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Successfully processed payment_intent.succeeded for ${internalTransactionId}. User ${userId} balance updated.`);
        });
      } catch (dbError) {
        console.error(`Database error processing payment_intent.succeeded ${internalTransactionId}:`, dbError);
        // If DB error, Stripe will retry if we send 500. This is often desired.
        return res.status(500).json({ error: 'Database processing error.' });
      }
      break;

    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      const { userId: failedUserId, internalTransactionId: failedInternalTxId } = paymentIntentFailed.metadata;

      if (!failedUserId || !failedInternalTxId) {
        console.error(`Missing metadata in payment_intent.payment_failed: ${paymentIntentFailed.id}`);
        return res.status(200).json({ received: true, error: 'Missing required metadata for failed payment.' });
      }
      
      try {
        const failedTxRef = db.collection('userWallets').doc(failedUserId)
                              .collection('transactions').doc(failedInternalTxId);
        
        await db.runTransaction(async (t) => {
            const txDoc = await t.get(failedTxRef);
            if (!txDoc.exists) {
                console.warn(`Transaction ${failedInternalTxId} not found for payment_intent.payment_failed ${paymentIntentFailed.id}.`);
                return; // Acknowledge
            }
            const txData = txDoc.data();
            if (txData.status === 'FAILED' || txData.status === 'COMPLETED') { // Avoid reprocessing
                console.log(`Transaction ${failedInternalTxId} already processed as ${txData.status}. Idempotency check passed for failure.`);
                return; // Acknowledge
            }

            t.update(failedTxRef, {
              status: 'FAILED',
              processedDate: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              paymentGatewayDetails: admin.firestore.FieldValue.arrayUnion({
                status: paymentIntentFailed.status, // should be 'requires_payment_method' or similar
                failureReason: paymentIntentFailed.last_payment_error?.message,
                failureCode: paymentIntentFailed.last_payment_error?.code,
              }),
            });
            console.log(`Processed payment_intent.payment_failed for ${failedInternalTxId}. User ${failedUserId}.`);
        });
      } catch (dbError) {
        console.error(`Database error processing payment_intent.payment_failed ${failedInternalTxId}:`, dbError);
        return res.status(500).json({ error: 'Database processing error for failed payment.' });
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}. Event ID: ${event.id}`);
      // Return a 200 for unhandled events to acknowledge receipt to Stripe
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true });
}
