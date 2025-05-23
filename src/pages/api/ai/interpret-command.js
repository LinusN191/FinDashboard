import admin from 'firebase-admin';
import axios from 'axios'; // For internal API calls
import crypto from 'crypto'; // For generating planId if needed, Firestore auto-ID is better

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
    console.log('Firebase Admin SDK initialized for /ai/interpret-command route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /ai/interpret-command route:', error.stack);
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
    return { uid: decodedToken.uid, token: idToken }; 
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token.' });
    return null;
  }
}

// --- Helper for internal API calls ---
const makeInternalApiCall = async (endpoint, payload, idToken) => {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const fullUrl = (process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith('http')) 
                    ? `https://${process.env.VERCEL_URL}${endpoint}` 
                    : `${baseUrl}${endpoint}`;
    try {
        const response = await axios.post(fullUrl, payload, {
            headers: { Authorization: `Bearer ${idToken}` },
        });
        return response.data; 
    } catch (error) {
        console.error(`Error calling internal API ${endpoint}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error || `Failed to call internal service: ${endpoint}`);
    }
};

// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const authResult = await verifyToken(req, res);
  if (!authResult) return;
  const { uid, token: idToken } = authResult;

  try {
    const { userPrompt } = req.body;
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
      return res.status(400).json({ error: 'Bad Request: "userPrompt" must be a non-empty string.' });
    }

    // Fetch User Context Data (simplified as before)
    let simplifiedInvestments = [];
    // ... (investment fetching logic - assumed from previous step)
     try {
        const investmentsSnapshot = await db.collection('userInvestments').where('userId', '==', uid).get();
        investmentsSnapshot.forEach(doc => {
            const data = doc.data();
            simplifiedInvestments.push({
                id: doc.id, // Keep track of document ID for potential execution
                name: data.name,
                symbol: data.tickerSymbol || data.apiId || data.cryptoSymbol,
                type: data.assetType,
                quantity: data.quantity,
                currentValue: data.currentValue,
                source: data.source || 'manual', 
            });
        });
    } catch (e) { console.error("Error fetching investments for prompt context:", e); }


    let walletInfo = "Wallet balance: Not available.";
    // ... (wallet fetching logic - assumed from previous step)
     try {
        const walletDoc = await db.collection('userWallets').doc(uid).get();
        if (walletDoc.exists) {
            const walletData = walletDoc.data();
            walletInfo = `Wallet balance: ${(walletData.balance / 100).toFixed(2)} ${walletData.currency}.`;
            if (walletData.cryptoBalances) {
                walletInfo += ` Crypto: ${Object.entries(walletData.cryptoBalances).map(([curr, bal]) => `${bal} ${curr.replace('_POLYGON', '')}`).join(', ')}.`;
            }
        } else {
            walletInfo = "Wallet balance: No wallet found (or balance is 0 USD).";
        }
    } catch (e) { console.error("Error fetching wallet for prompt context:", e); }


    let aiProfileInfo = "AI Profile: Risk Tolerance: medium, Investment Styles: [], Preferred Sectors: [].";
    // ... (AI profile fetching logic - assumed from previous step)
    try {
        const aiProfileDoc = await db.collection('userAiProfiles').doc(uid).get();
        if (aiProfileDoc.exists) {
            const userAiProfile = aiProfileDoc.data();
            aiProfileInfo = `AI Profile: Risk Tolerance: ${userAiProfile.riskTolerance || 'medium'}, Investment Styles: ${(userAiProfile.investmentStyle || []).join(', ')}, Preferred Sectors: ${(userAiProfile.preferredSectors || []).join(', ')}.`;
        } else {
            aiProfileInfo = "AI Profile: Not set up, using defaults (medium risk, no specific style/sectors).";
        }
    } catch (e) { console.error("Error fetching AI profile for prompt context:", e); }


    const mainPrompt = `
Your task is to parse the user's financial command and convert it into a structured JSON plan of action.
The user's command is: "${userPrompt}"
User's current context:
- Portfolio: ${simplifiedInvestments.length > 0 ? JSON.stringify(simplifiedInvestments) : "No investments found."}
- Wallet: ${walletInfo}
- AI Profile: ${aiProfileInfo}
Output a JSON object with "summary", "steps" (array of objects each with "step", "action", "asset" (with "type", "symbol", "name"), "quantity", "amountUSD", "source", "destination", "percentageOfProceeds", "details"), "warnings", and "confidenceScore".
Ensure action is one of: 'SELL', 'BUY', 'MOVE_TO_WALLET', 'ALLOCATE_FUNDS', 'HOLD', 'CONVERT', 'ADD_TO_WATCHLIST', 'PRICE_ALERT', 'RESEARCH', 'OTHER'.
For 'SELL' or 'BUY' of specific assets in portfolio, use their 'id' (e.g., "assetId": "firestore_doc_id_of_asset") in the asset object if you can identify them.
For 'MOVE_TO_WALLET', 'source' might be 'proceeds_from_step_X' or an asset, 'destination' is 'wallet'.
'ALLOCATE_FUNDS' usually follows a 'SELL' or 'MOVE_TO_WALLET' (from 'proceeds_from_step_X' or 'wallet') to 'BUY' actions.
Be very careful to output only the JSON object and nothing else.
`;

    const llmResponse = await makeInternalApiCall('/api/ai/generate-text', {
      prompt: mainPrompt, model: 'gpt-3.5-turbo', max_tokens: 1000, temperature: 0.2,
    }, idToken);

    if (!llmResponse.success || !llmResponse.generatedText) {
      throw new Error(llmResponse.error || 'AI text generation service failed to return text.');
    }

    let interpretedPlan;
    try {
      let rawJson = llmResponse.generatedText.trim();
      if (rawJson.startsWith("```json")) rawJson = rawJson.substring(7);
      if (rawJson.endsWith("```")) rawJson = rawJson.substring(0, rawJson.length - 3);
      interpretedPlan = JSON.parse(rawJson);
      if (!interpretedPlan.summary || !Array.isArray(interpretedPlan.steps)) {
        throw new Error('AI failed to generate a valid action plan structure (missing summary/steps).');
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError, '\nRaw LLM response was:', llmResponse.generatedText);
      return res.status(500).json({ error: 'AI failed to generate a valid action plan (JSON parsing error). Please try rephrasing.' });
    }

    // --- New: Save the plan to Firestore ---
    const planRef = db.collection('aiActionPlans').doc(); // Auto-generate ID
    const planId = planRef.id;

    const stepStatuses = interpretedPlan.steps.map((step, index) => ({
        stepNumber: step.step || index + 1, // Use step number from LLM or generate
        status: 'PENDING_USER_CONFIRMATION',
        executedAt: null,
        mockedResultDetails: null,
        errorDetails: null,
    }));

    const newPlanData = {
        planId,
        userId: uid,
        originalUserPrompt: userPrompt,
        interpretedPlan: interpretedPlan, // The full JSON from LLM
        overallStatus: 'PENDING_USER_CONFIRMATION',
        currentStepBeingExecuted: null,
        stepStatuses: stepStatuses,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await planRef.set(newPlanData);
    console.log(`New AI Action Plan ${planId} created for user ${uid}.`);

    // --- Modified Response ---
    res.status(200).json({ 
        success: true, 
        planId: planId, // Include planId in the response
        interpretedPlan: interpretedPlan 
    });

  } catch (error) {
    console.error(`Error in interpret-command for user ${uid}:`, error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error: Could not interpret command.' });
  }
}
