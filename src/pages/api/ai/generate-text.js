import admin from 'firebase-admin';
import OpenAI from 'openai';
import { decrypt } from '../../../utils/encryption'; // Import decrypt utility

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
    console.log('Firebase Admin SDK initialized for /ai/generate-text route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /ai/generate-text route:', error.stack);
  }
}

const db = admin.firestore();

// --- Authentication Helper ---
async function verifyToken(req, res) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header for Next.js API route.' });
    return null;
  }
  const idToken = authorizationHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token for Next.js API route:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token for Next.js API route.' });
    return null;
  }
}

// --- System Default OpenAI SDK Initialization (Fallback) ---
let systemOpenai;
const SYSTEM_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = 'gpt-3.5-turbo';

if (SYSTEM_OPENAI_API_KEY) {
    systemOpenai = new OpenAI({
        apiKey: SYSTEM_OPENAI_API_KEY,
    });
} else {
    console.error("CRITICAL: System default OPENAI_API_KEY environment variable is not set. System fallback OpenAI API calls will fail.");
}


// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return;
  
  let apiKeyToUse = SYSTEM_OPENAI_API_KEY;
  let modelToUse = req.body.model || DEFAULT_MODEL; // Default to request body or system default
  let usingUserKey = false;
  let userKeyError = null; // To store specific errors related to user key processing

  // 1. Fetch User's AI Profile
  try {
    const profileRef = db.collection('userAiProfiles').doc(uid);
    const profileDoc = await profileRef.get();

    if (profileDoc.exists) {
      const profileData = profileDoc.data();
      const llmOverride = profileData.llmOverride;

      if (llmOverride?.enabled === true && llmOverride?.encryptedApiKey) {
        try {
          const decryptedUserApiKey = decrypt(llmOverride.encryptedApiKey);
          if (decryptedUserApiKey) {
            apiKeyToUse = decryptedUserApiKey;
            // If llmOverride.model is set, it takes precedence over req.body.model
            modelToUse = llmOverride.model || modelToUse; 
            usingUserKey = true;
            console.log(`User ${uid} is using their custom OpenAI API key and model ${modelToUse}.`);
          } else {
            throw new Error("Decrypted API key was empty."); // Should not happen if encrypt stores non-empty
          }
        } catch (decryptionError) {
          console.error(`Failed to decrypt API key for user ${uid}:`, decryptionError.message);
          userKeyError = "Failed to decrypt your stored API key. Using system default LLM settings.";
          // Fallback to system defaults is already handled by initial apiKeyToUse/modelToUse values
        }
      }
    }
    // If no profile, no llmOverride, not enabled, or no encryptedApiKey, system defaults are used.
  } catch (profileError) {
    console.error(`Error fetching AI profile for user ${uid}:`, profileError);
    // Proceed with system defaults, do not block request.
  }

  // 2. Initialize OpenAI SDK with the determined key
  let currentOpenaiInstance;
  if (usingUserKey) {
    currentOpenaiInstance = new OpenAI({ apiKey: apiKeyToUse });
  } else {
    currentOpenaiInstance = systemOpenai; // Use pre-initialized system instance
  }

  // Check if any OpenAI SDK instance is available
  if (!currentOpenaiInstance) {
    const serviceErrorMsg = usingUserKey 
        ? 'User-specific OpenAI client could not be initialized (possibly invalid key after decryption).'
        : 'System OpenAI service is not configured (missing system API key).';
    console.error(`${serviceErrorMsg} Cannot process /ai/generate-text request for user ${uid}.`);
    return res.status(500).json({ error: 'AI service configuration error. Please contact support.' });
  }
  
  // If there was a user key error but we are falling back to system, inform the client
  if (userKeyError && !usingUserKey) {
    // We can choose to either fail the request or proceed with system default and just warn.
    // For now, let's add it to the response if we proceed, or return an error if strict.
    // Let's proceed but make it part of the error response if OpenAI call fails later.
  }


  try {
    // 3. Validate request body for prompt and other params
    const {
      prompt,
      max_tokens = 250,
      temperature = 0.7,
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Bad Request: "prompt" must be a non-empty string.' });
    }

    const maxTokensToUse = Number.isInteger(max_tokens) && max_tokens > 0 ? max_tokens : 250;
    const temperatureToUse = typeof temperature === 'number' && temperature >= 0 && temperature <= 2 ? temperature : 0.7;

    // 4. Make OpenAI API Call
    console.log(`Calling OpenAI for user ${uid} with model ${modelToUse} (using ${usingUserKey ? 'user' : 'system'} key), max_tokens ${maxTokensToUse}, temp ${temperatureToUse}`);
    
    const completion = await currentOpenaiInstance.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelToUse,
      max_tokens: maxTokensToUse,
      temperature: temperatureToUse,
    });

    const generatedText = completion.choices[0]?.message?.content?.trim() || '';
    
    res.status(200).json({ success: true, generatedText });

  } catch (error) {
    console.error(`Error calling OpenAI API for user ${uid} (using ${usingUserKey ? 'user' : 'system'} key, model ${modelToUse}):`, error);

    let statusCode = 500;
    let userMessage = 'Failed to generate AI content due to an internal server error.';

    if (error instanceof OpenAI.APIError) {
      statusCode = error.status || 500;
      userMessage = `AI Service Error: ${error.name || 'Unknown API Error'}.`;
      
      if (usingUserKey) { // More specific messages if user's key failed
        if (error.status === 401) {
          userMessage = "Your custom OpenAI API key is invalid or has been revoked. Please check your LLM configuration or disable custom settings.";
        } else if (error.status === 429) {
          userMessage = "Your custom OpenAI API key has exceeded its quota. Please check your OpenAI account or disable custom LLM settings.";
        } else if (error.message.includes("does not exist or you do not have access to it")) {
             userMessage = `The model "${modelToUse}" configured in your AI profile is not accessible with your API key. Please select a different model or check your OpenAI key permissions.`;
        } else {
          userMessage = `Error with your custom OpenAI configuration: ${error.message}. Please check your settings or use system defaults.`;
        }
      } else if (userKeyError) { // If user key decryption failed and system key also failed
         userMessage = `${userKeyError} The system's default LLM also encountered an issue: ${error.name || 'Unknown API Error'}.`;
      } else { // System key failed
        if (error.status === 401) userMessage = "AI Service Error: System OpenAI API Key is invalid. Please contact support.";
        else if (error.status === 429) userMessage = "AI Service Error: System rate limit exceeded. Please try again later.";
        else if (error.status === 503) userMessage = "AI Service is temporarily unavailable (system). Please try again later.";
      }
      console.error(`OpenAI API Error Details: Status ${error.status}, Message: ${error.message}, Type: ${error.type}, Code: ${error.code}`);
    } else if (userKeyError && !usingUserKey) {
        // This means user key decryption failed, we fell back to system key, and then another non-APIError happened.
        userMessage = `${userKeyError} Additionally, an unexpected error occurred while processing your request with system defaults.`;
    }
    
    res.status(statusCode).json({ success: false, error: userMessage });
  }
}
