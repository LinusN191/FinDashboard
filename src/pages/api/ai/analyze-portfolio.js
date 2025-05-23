import admin from 'firebase-admin';
import axios from 'axios'; // For internal API calls

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
    console.log('Firebase Admin SDK initialized for /ai/analyze-portfolio route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /ai/analyze-portfolio route:', error.stack);
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
    return { uid: decodedToken.uid, token: idToken }; // Return token as well for internal calls
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token.' });
    return null;
  }
}

// --- Helper for internal API calls ---
const makeInternalApiCall = async (endpoint, payload, idToken) => {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    // Prepend https:// if VERCEL_URL is just the domain
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
  if (req.method !== 'POST') { // Changed to POST as it's an action
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const authResult = await verifyToken(req, res);
  if (!authResult) return;
  const { uid, token: idToken } = authResult;

  try {
    // 2. Data Fetching
    const investmentsSnapshot = await db.collection('userInvestments').where('userId', '==', uid).get();
    const aiProfileRef = db.collection('userAiProfiles').doc(uid);
    const aiProfileDoc = await aiProfileRef.get();

    if (!aiProfileDoc.exists) {
      return res.status(400).json({ success: false, error: 'AI profile not set up. Please configure your AI preferences.' });
    }
    const userProfile = aiProfileDoc.data();

    if (investmentsSnapshot.empty) {
      return res.status(200).json({ success: true, message: 'No investments to analyze. Add some investments to get an analysis.', analysis: null });
    }

    // 3. Data Simplification
    const simplifiedInvestments = investmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return `${data.assetType} ${data.name || data.tickerSymbol || data.apiId || ''} (Value: $${(data.currentValue || 0).toFixed(0)})`;
    });
    const portfolioSummary = `Portfolio consists of: ${simplifiedInvestments.join(', ')}. Total items: ${simplifiedInvestments.length}.`;

    // 4. Prompt Engineering & 5. LLM Interaction (via internal call)
    const analysisResults = {};
    const llmParams = { model: 'gpt-3.5-turbo', max_tokens: 200, temperature: 0.6 };

    // Diversification
    const diversificationPrompt = `Analyze the diversification of this portfolio: ${portfolioSummary}. The investor's risk tolerance is "${userProfile.riskTolerance}" and their investment style includes "${(userProfile.investmentStyle || []).join(', ')}". Provide a diversification score from 1 (poorly diversified) to 10 (well diversified) and 2-3 brief bullet points explaining the score and suggesting improvements. Format as: "Score: [score].\n- [Point 1]\n- [Point 2]\n- [Point 3 (optional)]"`;
    try {
        const diversificationResponse = await makeInternalApiCall('/api/ai/generate-text', { prompt: diversificationPrompt, ...llmParams }, idToken);
        analysisResults.diversification = { remarks: diversificationResponse.generatedText || "No diversification analysis available." };
    } catch (e) {
        console.warn("Diversification analysis failed:", e.message);
        analysisResults.diversification = { remarks: "Diversification analysis could not be completed at this time." };
    }


    // Risk Assessment
    const riskPrompt = `Assess the primary risks for this portfolio: ${portfolioSummary}. The investor's risk tolerance is "${userProfile.riskTolerance}". List 2-3 main risk factors as bullet points. Format as:\n- [Risk Factor 1]\n- [Risk Factor 2]\n- [Risk Factor 3 (optional)]`;
     try {
        const riskResponse = await makeInternalApiCall('/api/ai/generate-text', { prompt: riskPrompt, ...llmParams }, idToken);
        analysisResults.risk = { assessment: riskResponse.generatedText || "No risk assessment available." };
    } catch (e) {
        console.warn("Risk assessment failed:", e.message);
        analysisResults.risk = { assessment: "Risk assessment could not be completed at this time." };
    }

    // Recommendations
    const recommendationsPrompt = `Based on this portfolio: ${portfolioSummary}, and the investor's profile (Risk Tolerance: "${userProfile.riskTolerance}", Investment Style: "${(userProfile.investmentStyle || []).join(', ')}", Preferred Sectors: "${(userProfile.preferredSectors || []).join(', ')}"), suggest 2-3 specific investment assets (stocks, ETFs, or other relevant types by name/symbol) that would complement this portfolio. For each, provide a brief 1-sentence rationale. Format as:\n- [Asset 1]: [Rationale 1]\n- [Asset 2]: [Rationale 2]\n- [Asset 3 (optional)]: [Rationale 3 (optional)]`;
    try {
        const recommendationsResponse = await makeInternalApiCall('/api/ai/generate-text', { prompt: recommendationsPrompt, ...llmParams, max_tokens: 250 }, idToken); // Slightly more tokens for recommendations
        analysisResults.recommendations = [{ suggestionAndRationale: recommendationsResponse.generatedText || "No recommendations available." }];
    } catch (e) {
        console.warn("Recommendations generation failed:", e.message);
        analysisResults.recommendations = [{ suggestionAndRationale: "Recommendations could not be generated at this time." }];
    }
    

    // 6. Response Formatting
    res.status(200).json({
      success: true,
      analysis: analysisResults,
      profileUsed: {
        riskTolerance: userProfile.riskTolerance,
        investmentStyle: userProfile.investmentStyle || [],
        preferredSectors: userProfile.preferredSectors || [],
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`Error in analyze-portfolio for user ${uid}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error: Could not complete portfolio analysis.' });
  }
}
