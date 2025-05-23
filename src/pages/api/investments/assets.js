import admin from 'firebase-admin';

// Firebase Admin SDK Configuration
// It's good practice to load this from environment variables
const firebaseAdminConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace \n with actual newlines if private_key is stored with escaped newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  }),
  // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` // Optional, if using Realtime Database
};

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp(firebaseAdminConfig);
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
    // We might want to throw this error or handle it more gracefully depending on startup requirements
  }
}

const db = admin.firestore();

// Helper function to verify Firebase ID token
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

export default async function handler(req, res) {
  const uid = await verifyToken(req, res);
  if (!uid) {
    // verifyToken already sent a response, so just return
    return;
  }

  const { assetId } = req.query; // Extract assetId for PUT/DELETE

  if (req.method === 'POST') {
    // Create Asset - assetId is not used here
    try {
      const {
        assetType, // e.g., 'STOCK', 'CRYPTO', 'REAL_ESTATE', 'OTHER'
        name,      // User-defined name for the asset
        quantity,
        purchasePrice,
        purchaseDate, // Expected in ISO 8601 format (YYYY-MM-DD)
        // Type-specific fields (add as needed based on assetType)
        tickerSymbol, // For STOCKS
        cryptoSymbol, // For CRYPTO
        propertyAddress, // For REAL_ESTATE
        // ... other specific fields
        notes, // Optional notes
      } = req.body;

      // Basic Validation
      if (!assetType || !name || quantity == null || purchasePrice == null || !purchaseDate) {
        return res.status(400).json({
          error: 'Bad Request: Missing required fields (assetType, name, quantity, purchasePrice, purchaseDate).',
        });
      }
      if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Bad Request: Quantity must be a positive number.' });
      }
      if (typeof purchasePrice !== 'number' || purchasePrice <= 0) {
        return res.status(400).json({ error: 'Bad Request: Purchase price must be a positive number.' });
      }
      // Validate purchaseDate format (basic check)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
        return res.status(400).json({ error: 'Bad Request: purchaseDate must be in YYYY-MM-DD format.'});
      }
      
      const newAssetData = {
        userId: uid,
        assetType,
        name,
        quantity,
        purchasePrice,
        purchaseDate: admin.firestore.Timestamp.fromDate(new Date(purchaseDate)), // Convert to Firestore Timestamp
        currentValue: purchasePrice * quantity, // Initial calculation
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPriceUpdate: admin.firestore.FieldValue.serverTimestamp(), // Initially same as creation
        notes: notes || null, // Optional
      };

      // Add type-specific fields
      if (assetType === 'STOCK' && tickerSymbol) newAssetData.tickerSymbol = tickerSymbol;
      if (assetType === 'CRYPTO' && cryptoSymbol) newAssetData.cryptoSymbol = cryptoSymbol;
      if (assetType === 'REAL_ESTATE' && propertyAddress) newAssetData.propertyAddress = propertyAddress;
      // Add more specific fields as they are defined in your data models

      const assetRef = await db.collection('userInvestments').add(newAssetData);
      const newAsset = await assetRef.get();

      res.status(201).json({ id: newAsset.id, ...newAsset.data() });

    } catch (error) {
      console.error('Error creating asset:', error);
      if (error.message.includes('Bad Request:')) { // Forward validation errors if any thrown by logic
          return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal Server Error: Could not create asset.' });
    }

  } else if (req.method === 'GET') {
    // Read All Assets
    try {
      const assetsSnapshot = await db.collection('userInvestments')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc') // Example ordering
        .get();

      if (assetsSnapshot.empty) {
        return res.status(200).json([]);
      }

      const assets = assetsSnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to ISO strings for JSON response
        return {
          id: doc.id,
          ...data,
          purchaseDate: data.purchaseDate ? data.purchaseDate.toDate().toISOString().split('T')[0] : null, // YYYY-MM-DD
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
          lastPriceUpdate: data.lastPriceUpdate ? data.lastPriceUpdate.toDate().toISOString() : null,
        };
      });

      res.status(200).json(assets);

    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Internal Server Error: Could not fetch assets.' });
    }

  } else if (req.method === 'PUT') {
    // Update Asset
    if (!assetId) {
      return res.status(400).json({ error: 'Bad Request: Missing assetId in query parameter.' });
    }

    try {
      const assetRef = db.collection('userInvestments').doc(assetId);
      const assetDoc = await assetRef.get();

      if (!assetDoc.exists) {
        return res.status(404).json({ error: 'Not Found: Asset not found.' });
      }

      const assetData = assetDoc.data();
      if (assetData.userId !== uid) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to update this asset.' });
      }

      const {
        assetType, // Should generally not be changed, or handled with care
        name,
        quantity,
        purchasePrice,
        purchaseDate, // Expected in ISO 8601 format (YYYY-MM-DD)
        tickerSymbol,
        cryptoSymbol,
        propertyAddress,
        notes,
      } = req.body;

      const updatePayload = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Validate and add fields to payload if they are provided
      if (name !== undefined) updatePayload.name = name;
      if (notes !== undefined) updatePayload.notes = notes === '' ? null : notes; // Allow clearing notes

      if (assetType !== undefined && assetType !== assetData.assetType) {
        // Changing assetType can be complex (e.g., tickerSymbol might become irrelevant).
        // For simplicity, we can disallow it or require all relevant new fields.
        // return res.status(400).json({ error: 'Bad Request: Asset type cannot be changed directly. Create a new asset instead.' });
        // Or, allow it and update:
        updatePayload.assetType = assetType; 
      }
      
      if (quantity !== undefined) {
        if (typeof quantity !== 'number' || quantity <= 0) {
          return res.status(400).json({ error: 'Bad Request: Quantity must be a positive number.' });
        }
        updatePayload.quantity = quantity;
      }
      
      if (purchasePrice !== undefined) {
        if (typeof purchasePrice !== 'number' || purchasePrice <= 0) {
          return res.status(400).json({ error: 'Bad Request: Purchase price must be a positive number.' });
        }
        updatePayload.purchasePrice = purchasePrice;
      }
      
      if (purchaseDate !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
          return res.status(400).json({ error: 'Bad Request: purchaseDate must be in YYYY-MM-DD format.'});
        }
        updatePayload.purchaseDate = admin.firestore.Timestamp.fromDate(new Date(purchaseDate));
      }

      // Recalculate currentValue if relevant fields changed
      const newQuantity = updatePayload.quantity !== undefined ? updatePayload.quantity : assetData.quantity;
      const newPurchasePrice = updatePayload.purchasePrice !== undefined ? updatePayload.purchasePrice : assetData.purchasePrice;
      if (updatePayload.quantity !== undefined || updatePayload.purchasePrice !== undefined) {
        updatePayload.currentValue = newPurchasePrice * newQuantity; // Based on purchase price
      }
      
      // Handle type-specific fields
      const finalAssetType = updatePayload.assetType || assetData.assetType;
      if (finalAssetType === 'STOCK') {
        if (tickerSymbol !== undefined) updatePayload.tickerSymbol = tickerSymbol;
      } else { // Clear if switching away from STOCK or not provided
        if (tickerSymbol === undefined && updatePayload.assetType && finalAssetType !== 'STOCK') {
            updatePayload.tickerSymbol = admin.firestore.FieldValue.delete();
        }
      }

      if (finalAssetType === 'CRYPTO') {
        if (cryptoSymbol !== undefined) updatePayload.cryptoSymbol = cryptoSymbol;
      } else {
        if (cryptoSymbol === undefined && updatePayload.assetType && finalAssetType !== 'CRYPTO') {
            updatePayload.cryptoSymbol = admin.firestore.FieldValue.delete();
        }
      }

      if (finalAssetType === 'REAL_ESTATE') {
        if (propertyAddress !== undefined) updatePayload.propertyAddress = propertyAddress;
      } else {
         if (propertyAddress === undefined && updatePayload.assetType && finalAssetType !== 'REAL_ESTATE') {
            updatePayload.propertyAddress = admin.firestore.FieldValue.delete();
        }
      }
      
      if (Object.keys(updatePayload).length === 1 && updatePayload.updatedAt) {
        // Only updatedAt is present, meaning no actual data changed.
        // We could skip the update or proceed. For now, proceed to update timestamp.
      }

      await assetRef.update(updatePayload);
      const updatedDoc = await assetRef.get();
      const updatedData = updatedDoc.data();

      res.status(200).json({
        id: updatedDoc.id,
        ...updatedData,
        purchaseDate: updatedData.purchaseDate ? updatedData.purchaseDate.toDate().toISOString().split('T')[0] : null,
        createdAt: updatedData.createdAt ? updatedData.createdAt.toDate().toISOString() : null,
        updatedAt: updatedData.updatedAt ? updatedData.updatedAt.toDate().toISOString() : null,
        lastPriceUpdate: updatedData.lastPriceUpdate ? updatedData.lastPriceUpdate.toDate().toISOString() : null,
      });

    } catch (error) {
      console.error('Error updating asset:', error);
      if (error.message.includes('Bad Request:')) {
          return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal Server Error: Could not update asset.' });
    }

  } else if (req.method === 'DELETE') {
    // Delete Asset
    if (!assetId) {
      return res.status(400).json({ error: 'Bad Request: Missing assetId in query parameter.' });
    }

    try {
      const assetRef = db.collection('userInvestments').doc(assetId);
      const assetDoc = await assetRef.get();

      if (!assetDoc.exists) {
        return res.status(404).json({ error: 'Not Found: Asset not found.' });
      }

      const assetData = assetDoc.data();
      if (assetData.userId !== uid) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this asset.' });
      }

      await assetRef.delete();

      res.status(200).json({ message: 'Asset deleted successfully.' });
      // Alternatively, use 204 No Content:
      // res.status(204).end();

    } catch (error) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: 'Internal Server Error: Could not delete asset.' });
    }

  } else {
    // Method Not Allowed
    res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
