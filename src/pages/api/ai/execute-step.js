import admin from 'firebase-admin';
import { ethers } from 'ethers'; // For potential crypto amount formatting if needed

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
    console.log('Firebase Admin SDK initialized for /ai/execute-step route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /ai/execute-step route:', error.stack);
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

  const { planId, stepNumber } = req.body;

  // 1. Validate Request Body
  if (!planId || typeof planId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: "planId" must be a non-empty string.' });
  }
  if (stepNumber == null || typeof stepNumber !== 'number' || stepNumber < 1) { // Steps are usually 1-indexed
    return res.status(400).json({ error: 'Bad Request: "stepNumber" must be a positive integer.' });
  }

  const planRef = db.collection('aiActionPlans').doc(planId);
  let planData;
  let stepToExecute;
  let stepIndex;

  try {
    // 2. Fetch and Validate Plan
    const planDoc = await planRef.get();
    if (!planDoc.exists) {
      return res.status(404).json({ error: 'Not Found: Action plan not found.' });
    }
    planData = planDoc.data();

    // Validate Ownership
    if (planData.userId !== uid) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to execute this plan.' });
    }

    // Validate Plan Status
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(planData.overallStatus)) {
      return res.status(400).json({ error: `Bad Request: Plan is already in status "${planData.overallStatus}" and cannot be executed further.` });
    }

    // Find and Validate Step
    stepIndex = planData.stepStatuses.findIndex(s => s.stepNumber === stepNumber);
    if (stepIndex === -1) {
      return res.status(404).json({ error: `Not Found: Step number ${stepNumber} not found in this plan.` });
    }
    
    // For V1, we allow re-trying from PENDING_USER_CONFIRMATION or executing if USER_CONFIRMED
    // A more robust system would strictly require USER_CONFIRMED.
    const currentStepStatus = planData.stepStatuses[stepIndex].status;
    if (!['PENDING_USER_CONFIRMATION', 'USER_CONFIRMED', 'MOCK_FAILED'].includes(currentStepStatus)) {
        return res.status(400).json({ error: `Bad Request: Step ${stepNumber} is currently in status "${currentStepStatus}" and cannot be executed or re-tried at this time.` });
    }
    
    stepToExecute = planData.interpretedPlan.steps.find(s => (s.step || s.stepNumber) === stepNumber); // LLM might use 'step' or 'stepNumber'
    if (!stepToExecute) {
        return res.status(404).json({ error: `Not Found: Details for step number ${stepNumber} not found in interpreted plan.` });
    }


    // Update plan and step status to 'SIMULATING' / 'IN_PROGRESS'
    const initialStatusUpdate = {
      overallStatus: 'IN_PROGRESS',
      currentStepBeingExecuted: stepNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    initialStatusUpdate[`stepStatuses.${stepIndex}.status`] = 'SIMULATING';
    initialStatusUpdate[`stepStatuses.${stepIndex}.mockedResultDetails`] = null; // Clear previous results
    initialStatusUpdate[`stepStatuses.${stepIndex}.errorDetails`] = null; // Clear previous errors
    await planRef.update(initialStatusUpdate);
    
    // --- Deep Mocking Logic ---
    if (stepToExecute.action === 'SELL') {
      // Fetch user's investments (simplified: assuming all are manual for V1 mock of sell)
      const investmentsSnapshot = await db.collection('userInvestments').where('userId', '==', uid).get();
      const userInvestments = investmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const assetToSell = userInvestments.find(inv => 
        (stepToExecute.asset.symbol && inv.tickerSymbol === stepToExecute.asset.symbol) ||
        (stepToExecute.asset.symbol && inv.cryptoSymbol === stepToExecute.asset.symbol) || // For crypto
        (stepToExecute.asset.symbol && inv.apiId === stepToExecute.asset.symbol) || // For crypto with apiId as symbol
        (stepToExecute.asset.id && inv.id === stepToExecute.asset.id) || // If LLM identified specific assetId
        (inv.name.toLowerCase() === stepToExecute.asset.name?.toLowerCase())
      );

      if (!assetToSell) {
        throw new Error(`Asset "${stepToExecute.asset.name || stepToExecute.asset.symbol}" not found in portfolio.`);
      }

      let quantityToSell = 0;
      if (stepToExecute.quantity?.toString().toUpperCase() === 'ALL') {
        quantityToSell = parseFloat(assetToSell.quantity);
      } else {
        quantityToSell = parseFloat(stepToExecute.quantity);
      }

      if (isNaN(quantityToSell) || quantityToSell <= 0) {
        throw new Error(`Invalid quantity "${stepToExecute.quantity}" for selling ${assetToSell.name}.`);
      }
      if (quantityToSell > parseFloat(assetToSell.quantity)) {
        throw new Error(`Insufficient balance of ${assetToSell.name}. Trying to sell ${quantityToSell}, but only ${assetToSell.quantity} available.`);
      }

      // Use currentValue if available, otherwise purchasePrice as fallback for mock
      const pricePerUnit = parseFloat(assetToSell.currentValue / assetToSell.quantity) || parseFloat(assetToSell.purchasePrice);
      if (isNaN(pricePerUnit)) {
        throw new Error(`Could not determine a valid price for ${assetToSell.name} for mock sale.`);
      }
      const estimatedProceeds = quantityToSell * pricePerUnit;
      const estimatedProceedsCents = Math.round(estimatedProceeds * 100); // Convert to cents for wallet

      // Firestore Transaction for SELL
      const walletRef = db.collection('userWallets').doc(uid);
      const newWalletTransactionRef = walletRef.collection('transactions').doc();

      await db.runTransaction(async (t) => {
        const assetRef = db.collection('userInvestments').doc(assetToSell.id);
        const currentAssetDoc = await t.get(assetRef); // Re-fetch inside transaction for consistency
        const currentAssetData = currentAssetDoc.data();

        const newQuantity = parseFloat(currentAssetData.quantity) - quantityToSell;
        
        if (newQuantity < 0) { // Should have been caught by earlier check, but good to have
            throw new Error("Transaction integrity error: Quantity became negative during transaction.");
        }
        
        // Update investment document
        if (newQuantity === 0) {
          t.delete(assetRef); // Or mark as inactive/zero quantity
        } else {
          t.update(assetRef, { 
            quantity: newQuantity, 
            // Recalculate currentValue based on new quantity and old price for simplicity, 
            // or set to 0 if all sold. This mock doesn't re-fetch live price.
            currentValue: newQuantity * pricePerUnit, 
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        }

        // Update wallet balance
        const walletDoc = await t.get(walletRef);
        let newWalletBalance = estimatedProceedsCents; // Assume wallet balance is in cents
        if (walletDoc.exists) {
          newWalletBalance = (walletDoc.data().balance || 0) + estimatedProceedsCents;
        }
        t.set(walletRef, { 
            balance: newWalletBalance, 
            currency: 'USD', // V1 assumption
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });

        // Create wallet transaction record
        t.set(newWalletTransactionRef, {
          type: 'MOCK_TRADE_SELL', status: 'COMPLETED', amount: estimatedProceedsCents, currency: 'USD',
          description: `Mock sale of ${quantityToSell.toFixed(2)} ${assetToSell.name || assetToSell.symbol}`,
          transactionDate: admin.firestore.FieldValue.serverTimestamp(),
          userId: uid, walletId: uid, aiActionPlanId: planId, aiActionPlanStep: stepNumber,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Update plan step status
      const successUpdate = {};
      successUpdate[`stepStatuses.${stepIndex}.status`] = 'MOCK_COMPLETED';
      successUpdate[`stepStatuses.${stepIndex}.mockedResultDetails`] = `Simulated sale of ${quantityToSell.toFixed(2)} ${assetToSell.name || assetToSell.symbol} for approx. $${estimatedProceeds.toFixed(2)}. Funds added to USD wallet.`;
      successUpdate[`stepStatuses.${stepIndex}.executedAt`] = admin.firestore.FieldValue.serverTimestamp();
      successUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      // Check if all steps are completed
      const updatedPlanDocForCompletionCheck = await planRef.get(); // Re-fetch to ensure we have latest step statuses
      const updatedPlanDataForCompletionCheck = updatedPlanDocForCompletionCheck.data();
      const allStepsCompleted = updatedPlanDataForCompletionCheck.stepStatuses.every(s => s.status === 'MOCK_COMPLETED');
      if (allStepsCompleted) {
        successUpdate.overallStatus = 'COMPLETED';
        successUpdate.currentStepBeingExecuted = null;
      } else {
        successUpdate.currentStepBeingExecuted = null; // Or move to next pending step if implementing auto-proceed
      }
      await planRef.update(successUpdate);

      return res.status(200).json({ 
        success: true, 
        planId, 
        executedStep: stepNumber,
        status: 'MOCK_COMPLETED', 
        details: successUpdate[`stepStatuses.${stepIndex}.mockedResultDetails`],
        overallPlanStatus: successUpdate.overallStatus || planData.overallStatus, // Use updated status if changed
      });

    } else {
      // Other action types
      throw new Error(`Action type "${stepToExecute.action}" not yet supported for mock execution.`);
    }

  } catch (error) {
    console.error(`Error executing step ${stepNumber} for plan ${planId}, user ${uid}:`, error);
    // Update plan and step status to 'MOCK_FAILED'
    const errorUpdate = {};
    errorUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    errorUpdate.currentStepBeingExecuted = null; // Clear current step
    // Only update step status if stepIndex is valid (it should be if we reached here after initial fetch)
    if (stepIndex !== undefined && stepIndex !== -1) {
        errorUpdate[`stepStatuses.${stepIndex}.status`] = 'MOCK_FAILED';
        errorUpdate[`stepStatuses.${stepIndex}.errorDetails`] = error.message || 'An unknown error occurred during mock execution.';
        errorUpdate[`stepStatuses.${stepIndex}.executedAt`] = admin.firestore.FieldValue.serverTimestamp();
    }
    // Optionally set overall plan status to FAILED if a step fails critically
    // errorUpdate.overallStatus = 'FAILED'; // Uncomment if one failed step fails the whole plan

    try {
        await planRef.update(errorUpdate);
    } catch (updateError) {
        console.error(`Failed to update plan status after error for plan ${planId}:`, updateError);
    }

    return res.status(error.message.startsWith("Asset") || error.message.startsWith("Insufficient") || error.message.startsWith("Could not determine") ? 400 : 500)
              .json({ success: false, error: error.message || 'Internal Server Error: Could not execute step.' });
  }
}
