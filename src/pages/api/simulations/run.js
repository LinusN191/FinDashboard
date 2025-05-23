import admin from 'firebase-admin';
import axios from 'axios'; // Added for internal API calls

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
    console.log('Firebase Admin SDK initialized for /simulations/run route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /simulations/run route:', error.stack);
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
    return { uid: decodedToken.uid, token: idToken }; // Return token as well
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token.' });
    return null;
  }
}

// --- Simulation Parameters (Hardcoded V1) ---
const GROWTH_RATES = {
  average_growth: 0.07, // 7%
  recession: -0.05,     // -5%
  bull_market: 0.12,    // 12%
};

const TIME_HORIZON_MONTHS = {
  '6_months': 6,
  '1_year': 12,
  '2_years': 24,
  '3_years': 36,
  '5_years': 60,
};

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
      return response.data.generatedText || '';
  } catch (e) {
      console.warn(`Error calling internal API ${endpoint} for simulation narrative:`, e.response?.data?.error || e.message);
      return `Could not generate this part of the narrative due to an internal service error.`;
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
    // 1. Fetch User AI Profile
    let userProfile = null;
    let aiProfileError = null;
    try {
      const aiProfileRef = db.collection('userAiProfiles').doc(uid);
      const aiProfileDoc = await aiProfileRef.get();
      if (aiProfileDoc.exists) {
        userProfile = aiProfileDoc.data();
      } else {
        aiProfileError = 'AI profile not set up. Personalized narrative will be limited.';
      }
    } catch (profileFetchError) {
      console.error(`Error fetching AI profile for user ${uid}:`, profileFetchError);
      aiProfileError = 'Could not retrieve AI profile. Personalized narrative will be limited.';
    }

    // 2. Validate req.body
    const {
      simulatedAssets,
      timeHorizon,
      contributionFrequency,
      contributionAmount,
      marketScenario,
    } = req.body;

    if (!simulatedAssets || !Array.isArray(simulatedAssets) || simulatedAssets.length === 0) {
      return res.status(400).json({ error: 'Bad Request: "simulatedAssets" must be a non-empty array.' });
    }
    if (!simulatedAssets.every(asset => typeof asset.simulatedAmount === 'number' && asset.simulatedAmount >= 0)) {
      return res.status(400).json({ error: 'Bad Request: Each asset in "simulatedAssets" must have a non-negative "simulatedAmount".' });
    }
    if (!timeHorizon || !TIME_HORIZON_MONTHS[timeHorizon]) {
      return res.status(400).json({ error: 'Bad Request: Invalid "timeHorizon".' });
    }
    if (!contributionFrequency || !['none', 'monthly', 'quarterly', 'annually'].includes(contributionFrequency)) {
      return res.status(400).json({ error: 'Bad Request: Invalid "contributionFrequency".' });
    }
    if (contributionFrequency !== 'none' && (typeof contributionAmount !== 'number' || contributionAmount <= 0)) {
      return res.status(400).json({ error: 'Bad Request: "contributionAmount" must be a positive number when frequency is not "none".' });
    }
    if (!marketScenario || !GROWTH_RATES[marketScenario]) {
      return res.status(400).json({ error: 'Bad Request: Invalid "marketScenario".' });
    }

    // 3. Simulation Parameters & Assumptions
    const annualGrowthRate = GROWTH_RATES[marketScenario];
    const totalMonths = TIME_HORIZON_MONTHS[timeHorizon];
    const monthlyGrowthRate = annualGrowthRate / 12;
    const actualContributionAmount = contributionFrequency === 'none' ? 0 : contributionAmount;

    // 4. Core Simulation Logic
    const initialPortfolioValue = simulatedAssets.reduce((sum, asset) => sum + asset.simulatedAmount, 0);
    if (initialPortfolioValue <= 0 && actualContributionAmount <=0) {
         return res.status(400).json({ error: 'Bad Request: Initial portfolio value and contribution amount cannot both be zero or less.' });
    }

    let currentValue = initialPortfolioValue;
    let totalContributionsMade = 0;
    const simulationResults = [{
      period: 0,
      date: new Date().toISOString(),
      portfolioValue: parseFloat(currentValue.toFixed(2)),
      contributions: parseFloat(totalContributionsMade.toFixed(2)),
      gains: 0,
    }];

    const startDate = new Date();

    for (let period = 1; period <= totalMonths; period++) {
      const periodDate = new Date(startDate);
      periodDate.setMonth(startDate.getMonth() + period);

      let periodContribution = 0;
      if (contributionFrequency === 'monthly') {
        periodContribution = actualContributionAmount;
      } else if (contributionFrequency === 'quarterly' && period % 3 === 0) {
        periodContribution = actualContributionAmount;
      } else if (contributionFrequency === 'annually' && period % 12 === 0) {
        periodContribution = actualContributionAmount;
      }

      currentValue += periodContribution;
      totalContributionsMade += periodContribution;
      
      currentValue *= (1 + monthlyGrowthRate);

      const currentGains = currentValue - initialPortfolioValue - totalContributionsMade;

      simulationResults.push({
        period,
        date: periodDate.toISOString(),
        portfolioValue: parseFloat(currentValue.toFixed(2)),
        contributions: parseFloat(totalContributionsMade.toFixed(2)),
        gains: parseFloat(currentGains.toFixed(2)),
      });
    }

    // 5. AI Narrative Generation
    let aiNarrative = {
      summary: aiProfileError || "AI narrative generation skipped due to simulation error or missing profile.",
      scenarioImpactAndProfileRelation: aiProfileError || "AI narrative generation skipped.",
      takeaways: aiProfileError || "AI narrative generation skipped.",
    };
    let profileUsedForNarrative = null;

    if (simulationResults.length > 0) {
      if (userProfile) {
        profileUsedForNarrative = {
          riskTolerance: userProfile.riskTolerance,
          investmentStyle: userProfile.investmentStyle || [],
        };
      } else {
        profileUsedForNarrative = { riskTolerance: 'not specified', investmentStyle: ['general'] };
      }

      const initialVal = simulationResults[0].portfolioValue;
      const finalVal = simulationResults[simulationResults.length - 1].portfolioValue;
      const totalGain = simulationResults[simulationResults.length - 1].gains;
      const totalContrib = simulationResults[simulationResults.length - 1].contributions;
      const timeHor = timeHorizon.replace('_', ' ');
      const scenario = marketScenario.replace('_', ' ');

      const llmParams = { model: 'gpt-3.5-turbo', max_tokens: 180, temperature: 0.7 };
      
      if (!aiProfileError) { // Only proceed if profile was fetched successfully AND simulation ran
        // Prompt 1: Overall Summary
        const summaryPrompt = `Given an investment simulation with initial investment ${initialVal.toFixed(0)}, final value ${finalVal.toFixed(0)} over ${timeHor} using a ${scenario} scenario, resulting in total gains of ${totalGain.toFixed(0)} after total contributions of ${totalContrib.toFixed(0)}, provide a concise (2-3 sentences) overall summary of this simulation outcome. Focus on the growth and final value in plain language.`;
        aiNarrative.summary = await makeInternalApiCall('/api/ai/generate-text', { prompt: summaryPrompt, ...llmParams }, idToken);

        // Prompt 2: Scenario & Profile Impact
        const scenarioImpactPrompt = `For the simulation outcome (final value ${finalVal.toFixed(0)} from initial ${initialVal.toFixed(0)} in ${timeHor} under ${scenario}), briefly explain (1-2 sentences) the potential impact of this market scenario. Then, relate this outcome (1-2 sentences) to a user with ${profileUsedForNarrative.riskTolerance} risk tolerance and an investment style focused on ${(profileUsedForNarrative.investmentStyle || ['general']).join(', ')}.`;
        aiNarrative.scenarioImpactAndProfileRelation = await makeInternalApiCall('/api/ai/generate-text', { prompt: scenarioImpactPrompt, ...llmParams }, idToken);
        
        // Prompt 3: Key Takeaways
        const takeawaysPrompt = `Based on this simulation (final value ${finalVal.toFixed(0)}, gains ${totalGain.toFixed(0)}, contributions ${totalContrib.toFixed(0)} over ${timeHor} with ${scenario}), list 1-2 key observations or potential takeaways for the user. Format as bullet points (e.g., "- Takeaway 1..."). Keep each point brief.`;
        aiNarrative.takeaways = await makeInternalApiCall('/api/ai/generate-text', { prompt: takeawaysPrompt, ...llmParams }, idToken);
      }
    }

    // 6. Response
    res.status(200).json({
      success: true,
      results: simulationResults,
      aiNarrative: aiNarrative,
      profileUsedForNarrative: profileUsedForNarrative, 
    });

  } catch (error) {
    console.error(`Error during simulation processing for user ${uid}:`, error);
    res.status(500).json({ success: false, error: 'Internal Server Error: Could not run simulation.' });
  }
}
