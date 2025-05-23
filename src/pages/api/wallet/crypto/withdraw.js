import admin from 'firebase-admin';
import { ethers } from 'ethers';
import crypto from 'crypto'; // For internalTransactionId

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
    console.log('Firebase Admin SDK initialized for /crypto/withdraw route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

const db = admin.firestore();

// --- Environment Variable Checks ---
const POLYGON_NODE_RPC_URL = process.env.POLYGON_NODE_RPC_URL;
const PLATFORM_HOT_WALLET_PRIVATE_KEY = process.env.PLATFORM_HOT_WALLET_PRIVATE_KEY;
const POLYGON_USDC_CONTRACT_ADDRESS = process.env.POLYGON_USDC_CONTRACT_ADDRESS;
const POLYGON_USDT_CONTRACT_ADDRESS = process.env.POLYGON_USDT_CONTRACT_ADDRESS;

if (!POLYGON_NODE_RPC_URL || !PLATFORM_HOT_WALLET_PRIVATE_KEY || !POLYGON_USDC_CONTRACT_ADDRESS || !POLYGON_USDT_CONTRACT_ADDRESS) {
  console.error("CRITICAL: Missing one or more required environment variables for crypto withdrawal processing. This endpoint will not function correctly.");
}

// --- ERC20 ABI (Simplified for transfer and decimals) ---
const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)", // Optional, for logging
];

const SUPPORTED_TOKENS_CONFIG = {
  'USDC_POLYGON': { address: POLYGON_USDC_CONTRACT_ADDRESS, symbol: 'USDC', chain: 'Polygon', decimals: 6, decimalsFetched: false },
  'USDT_POLYGON': { address: POLYGON_USDT_CONTRACT_ADDRESS, symbol: 'USDT', chain: 'Polygon', decimals: 6, decimalsFetched: false },
};

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

  if (!POLYGON_NODE_RPC_URL || !PLATFORM_HOT_WALLET_PRIVATE_KEY) {
    console.error('Withdrawal service not configured: Missing Polygon RPC URL or Hot Wallet Private Key.');
    return res.status(500).json({ error: 'Withdrawal service not configured.' });
  }

  const uid = await verifyToken(req, res);
  if (!uid) return; 

  const { amount, currency, toAddress } = req.body;
  const internalTransactionId = crypto.randomUUID(); // Generate unique ID for this operation

  // 3. Request Body Validation
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Bad Request: "amount" must be a positive integer (smallest unit).' });
  }
  if (!currency || !SUPPORTED_TOKENS_CONFIG[currency.toUpperCase()]) {
    return res.status(400).json({ error: `Bad Request: Currency "${currency}" is not supported. Supported: ${Object.keys(SUPPORTED_TOKENS_CONFIG).join(', ')}` });
  }
  if (!toAddress || !ethers.utils.isAddress(toAddress)) {
    return res.status(400).json({ error: 'Bad Request: "toAddress" is not a valid EVM-compatible address.' });
  }

  const tokenConfig = SUPPORTED_TOKENS_CONFIG[currency.toUpperCase()];
  const provider = new ethers.providers.JsonRpcProvider(POLYGON_NODE_RPC_URL);
  const hotWallet = new ethers.Wallet(PLATFORM_HOT_WALLET_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(tokenConfig.address, erc20Abi, hotWallet);

  // Fetch actual decimals if not fetched yet
  if (!tokenConfig.decimalsFetched) {
    try {
        const decimals = await contract.decimals();
        tokenConfig.decimals = parseInt(decimals.toString()); // Ensure it's a number
        tokenConfig.decimalsFetched = true;
    } catch (decError) {
        console.error(`Could not fetch decimals for ${tokenConfig.symbol}. Using default ${tokenConfig.decimals}. Error: ${decError.message}`);
        // Proceed with default, but log error
    }
  }
  const amountInTokenUnits = ethers.BigNumber.from(amount.toString()); // Amount is already in smallest unit

  // References
  const userWalletRef = db.collection('userWallets').doc(uid);
  const userTransactionRef = userWalletRef.collection('transactions').doc(internalTransactionId);

  try {
    // 4. Withdrawal Logic
    // Firestore Transaction (Part 1 - Pre-Broadcast)
    await db.runTransaction(async (t) => {
      const walletDoc = await t.get(userWalletRef);
      if (!walletDoc.exists) {
        throw new Error('User wallet not found.');
      }
      const walletData = walletDoc.data();
      const currentCryptoBalanceStr = (walletData.cryptoBalances && walletData.cryptoBalances[currency.toUpperCase()]) ? walletData.cryptoBalances[currency.toUpperCase()].toString() : '0';
      const currentCryptoBalance = ethers.utils.parseUnits(currentCryptoBalanceStr, tokenConfig.decimals);

      if (currentCryptoBalance.lt(amountInTokenUnits)) {
        throw new Error('Insufficient funds.');
      }

      const newCryptoBalance = currentCryptoBalance.sub(amountInTokenUnits);
      const newCryptoBalances = {
        ...(walletData.cryptoBalances || {}),
        [currency.toUpperCase()]: ethers.utils.formatUnits(newCryptoBalance, tokenConfig.decimals),
      };

      t.update(userWalletRef, { 
        cryptoBalances: newCryptoBalances,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });

      const transactionData = {
        type: 'WITHDRAWAL_CRYPTO',
        status: 'PENDING_BROADCAST',
        amount: Number(ethers.utils.formatUnits(amountInTokenUnits, tokenConfig.decimals)), // Store human-readable for display
        amountSmallestUnit: amountInTokenUnits.toString(),
        currency: currency.toUpperCase(),
        toAddress: toAddress,
        userId: uid,
        walletId: uid,
        transactionDate: admin.firestore.FieldValue.serverTimestamp(),
        description: `Crypto withdrawal of ${ethers.utils.formatUnits(amountInTokenUnits, tokenConfig.decimals)} ${tokenConfig.symbol} to ${toAddress}`,
        paymentGatewayDetails: { type: 'CRYPTO', network: tokenConfig.chain },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      t.set(userTransactionRef, transactionData);
    });

    console.log(`Pre-broadcast Firestore transaction committed for ${internalTransactionId}, user ${uid}.`);

    // Sign & Broadcast Blockchain Transaction
    let broadcastResponse;
    try {
      // Get current gas price (consider using a reliable gas station API for production)
      const gasPrice = await provider.getGasPrice();
      // Estimate gas
      const gasLimit = await contract.estimateGas.transfer(toAddress, amountInTokenUnits);
      
      console.log(`Broadcasting tx for ${internalTransactionId}: To ${toAddress}, Amount ${ethers.utils.formatUnits(amountInTokenUnits, tokenConfig.decimals)} ${tokenConfig.symbol}, GasLimit ${gasLimit.toString()}, GasPrice ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

      broadcastResponse = await contract.transfer(toAddress, amountInTokenUnits, {
        gasLimit: gasLimit.mul(12).div(10), // Add 20% buffer to gasLimit
        gasPrice: gasPrice,
        // Nonce will be handled automatically by ethers.js Wallet instance for sequential txs
      });
      console.log(`Blockchain transaction broadcasted for ${internalTransactionId}. Hash: ${broadcastResponse.hash}`);

      // Firestore Update (Part 2 - Post-Broadcast Success)
      await userTransactionRef.update({
        status: 'PENDING_CONFIRMATION', // Or 'PROCESSING_ONCHAIN'
        'paymentGatewayDetails.transactionHash': broadcastResponse.hash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Withdrawal initiated successfully.', 
        internalTransactionId, 
        transactionHash: broadcastResponse.hash 
      });

    } catch (blockchainError) {
      console.error(`Blockchain broadcast or post-broadcast update failed for ${internalTransactionId}:`, blockchainError);
      // Attempt to revert or mark as failed in Firestore
      try {
        await userTransactionRef.update({
          status: 'FAILED_BROADCAST',
          'paymentGatewayDetails.broadcastError': blockchainError.message || 'Unknown broadcast error',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Note: Reverting the balance decrement is complex and risky here.
        // It's often better to have a clear "failed" state and require manual reconciliation
        // or a separate refund process if the funds were debited but not sent.
        // For V1, we log and mark as failed. The balance was already debited.
        console.warn(`Marked transaction ${internalTransactionId} as FAILED_BROADCAST. User balance was debited. Manual review may be needed.`);
      } catch (revertError) {
        console.error(`CRITICAL: Failed to mark transaction ${internalTransactionId} as FAILED_BROADCAST after blockchain error. Manual intervention required. Revert Error:`, revertError);
      }
      return res.status(500).json({ error: `Withdrawal broadcast failed: ${blockchainError.message}` });
    }

  } catch (error) {
    console.error(`Error processing crypto withdrawal for user ${uid}:`, error);
    if (error.message === 'User wallet not found.' || error.message === 'Insufficient funds.') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error: Could not process crypto withdrawal.' });
  }
}
