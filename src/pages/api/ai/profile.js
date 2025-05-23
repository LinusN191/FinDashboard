import admin from 'firebase-admin';
import { encrypt, decrypt } from '../../../utils/encryption'; // Import encryption utilities

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
    console.log('Firebase Admin SDK initialized for /ai/profile route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in /ai/profile route:', error.stack);
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

// --- Default Profile Structure ---
const defaultLlmOverride = {
  enabled: false,
  provider: 'openai', // Default for V1
  model: 'gpt-3.5-turbo', // Default model
  isUserApiKeySet: false, // Client-facing field
  // encryptedApiKey is not part of default, only if set by user
};

const defaultAiProfile = {
  riskTolerance: null,
  investmentStyle: [],
  preferredSectors: [],
  llmOverride: { ...defaultLlmOverride }, // Include default LLM override settings
};

// --- Helper to format Firestore Timestamps and LLM Override for client ---
const formatProfileForClient = (profileData) => {
  const formatted = { ...defaultAiProfile, ...profileData }; // Start with defaults, then overwrite

  if (profileData.createdAt && profileData.createdAt.toDate) {
    formatted.createdAt = profileData.createdAt.toDate().toISOString();
  }
  if (profileData.updatedAt && profileData.updatedAt.toDate) {
    formatted.updatedAt = profileData.updatedAt.toDate().toISOString();
  }

  // Ensure llmOverride exists and has defaults, then adjust based on stored data
  formatted.llmOverride = { 
    ...defaultLlmOverride, // Start with defaults
    ...(profileData.llmOverride || {}) // Spread stored llmOverride if it exists
  };

  if (profileData.llmOverride && profileData.llmOverride.encryptedApiKey) {
    formatted.llmOverride.isUserApiKeySet = true;
  } else {
    formatted.llmOverride.isUserApiKeySet = false;
  }
  delete formatted.llmOverride.encryptedApiKey; // Always remove encrypted key from client response

  return formatted;
};

// Supported OpenAI models for V1
const SUPPORTED_OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];


// --- Main API Handler ---
export default async function handler(req, res) {
  const uid = await verifyToken(req, res);
  if (!uid) return;

  if (req.method === 'GET') {
    try {
      const profileRef = db.collection('userAiProfiles').doc(uid);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        return res.status(200).json(defaultAiProfile); // Return full default structure
      } else {
        const profileData = profileDoc.data();
        return res.status(200).json(formatProfileForClient(profileData));
      }
    } catch (error) {
      console.error(`Error fetching AI profile for user ${uid}:`, error);
      return res.status(500).json({ error: 'Internal Server Error: Could not retrieve AI profile.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { riskTolerance, investmentStyle, preferredSectors, llmOverride } = req.body;
      const allowedFields = ['riskTolerance', 'investmentStyle', 'preferredSectors', 'llmOverride'];
      
      for (const key in req.body) {
        if (!allowedFields.includes(key)) {
          return res.status(400).json({ error: `Bad Request: Unknown field "${key}".` });
        }
      }
      
      const profileDataToSave = {};

      // Validate standard profile fields
      if (riskTolerance !== undefined) {
        if (riskTolerance === null || ['low', 'medium', 'high'].includes(riskTolerance)) {
          profileDataToSave.riskTolerance = riskTolerance;
        } else {
          return res.status(400).json({ error: 'Bad Request: Invalid "riskTolerance".' });
        }
      }
      if (investmentStyle !== undefined) {
        if (Array.isArray(investmentStyle) && investmentStyle.every(s => typeof s === 'string')) {
          profileDataToSave.investmentStyle = investmentStyle;
        } else {
          return res.status(400).json({ error: 'Bad Request: "investmentStyle" must be an array of strings.' });
        }
      }
      if (preferredSectors !== undefined) {
        if (Array.isArray(preferredSectors) && preferredSectors.every(s => typeof s === 'string')) {
          profileDataToSave.preferredSectors = preferredSectors;
        } else {
          return res.status(400).json({ error: 'Bad Request: "preferredSectors" must be an array of strings.' });
        }
      }
      
      // Validate and process llmOverride
      if (llmOverride !== undefined) {
        if (typeof llmOverride !== 'object' || llmOverride === null || Array.isArray(llmOverride)) {
            return res.status(400).json({ error: 'Bad Request: "llmOverride" must be an object.' });
        }

        profileDataToSave.llmOverride = {}; // Initialize the object to be saved

        // Enabled flag
        if (typeof llmOverride.enabled === 'boolean') {
          profileDataToSave.llmOverride.enabled = llmOverride.enabled;
        } else if (llmOverride.enabled !== undefined) {
          return res.status(400).json({ error: 'Bad Request: "llmOverride.enabled" must be a boolean.' });
        }

        // Model
        if (llmOverride.model !== undefined) {
          if (typeof llmOverride.model === 'string' && SUPPORTED_OPENAI_MODELS.includes(llmOverride.model)) {
            profileDataToSave.llmOverride.model = llmOverride.model;
          } else {
            return res.status(400).json({ error: `Bad Request: Invalid "llmOverride.model". Supported models: ${SUPPORTED_OPENAI_MODELS.join(', ')}.` });
          }
        }
        
        // API Key (encrypt if provided, clear if explicitly set to empty/null)
        if (llmOverride.apiKey !== undefined) {
          if (typeof llmOverride.apiKey === 'string' && llmOverride.apiKey.trim() !== '') {
            try {
              profileDataToSave.llmOverride.encryptedApiKey = encrypt(llmOverride.apiKey.trim());
            } catch (encryptionError) {
              console.error('Encryption failed for user-provided API key:', encryptionError);
              return res.status(500).json({ error: 'Failed to secure API key.' });
            }
          } else { 
            // If apiKey is empty string or null, treat as intent to clear/disable user key
            profileDataToSave.llmOverride.encryptedApiKey = null; 
          }
        }
        // Provider (hardcoded for V1)
        profileDataToSave.llmOverride.provider = 'openai';
      }


      profileDataToSave.userId = uid; 
      profileDataToSave.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      const profileRef = db.collection('userAiProfiles').doc(uid);
      const currentDoc = await profileRef.get();

      if (!currentDoc.exists) {
        profileDataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
        // Ensure default fields are set if creating new, and merge with incoming data
        const initialProfile = { ...defaultAiProfile, ...profileDataToSave };
        // llmOverride needs careful merging: incoming llmOverride fields should take precedence over defaultLlmOverride
        initialProfile.llmOverride = { 
            ...defaultLlmOverride, 
            ...(profileDataToSave.llmOverride || {}) 
        };
        // Ensure encryptedApiKey from profileDataToSave is preserved if it was set
        if (profileDataToSave.llmOverride?.hasOwnProperty('encryptedApiKey')) {
            initialProfile.llmOverride.encryptedApiKey = profileDataToSave.llmOverride.encryptedApiKey;
        }

        await profileRef.set(initialProfile);
      } else {
        // If document exists, merge only provided fields.
        // Firestore's set with merge:true handles nested objects by replacing them,
        // so we need to fetch existing llmOverride and merge manually if only parts of it are sent.
        const existingData = currentDoc.data();
        let finalLlmOverride = existingData.llmOverride || {};
        if (profileDataToSave.llmOverride) { // If llmOverride is being updated
            finalLlmOverride = { ...finalLlmOverride, ...profileDataToSave.llmOverride };
            // If apiKey was explicitly set to null/empty to clear it
            if (llmOverride && llmOverride.apiKey !== undefined && (llmOverride.apiKey === '' || llmOverride.apiKey === null)) {
                finalLlmOverride.encryptedApiKey = null;
            }
        }
        profileDataToSave.llmOverride = finalLlmOverride;
        await profileRef.set(profileDataToSave, { merge: true });
      }
      
      const updatedDoc = await profileRef.get();
      // formatProfileForClient will handle default structure and client-side formatting
      const responseData = updatedDoc.exists ? formatProfileForClient(updatedDoc.data()) : formatProfileForClient({}); 

      return res.status(200).json(responseData);

    } catch (error) {
      console.error(`Error creating/updating AI profile for user ${uid}:`, error);
      return res.status(500).json({ error: 'Internal Server Error: Could not save AI profile.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
