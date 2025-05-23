import admin from 'firebase-admin';
import { ethers } from 'ethers';

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
    console.log('Firebase Admin SDK initialized for /crypto/process-deposits route.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

const db = admin.firestore();

// --- Environment Variable Checks ---
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const POLYGON_NODE_RPC_URL = process.env.POLYGON_NODE_RPC_URL;
const POLYGON_USDC_CONTRACT_ADDRESS = process.env.POLYGON_USDC_CONTRACT_ADDRESS;
const POLYGON_USDT_CONTRACT_ADDRESS = process.env.POLYGON_USDT_CONTRACT_ADDRESS;

if (!INTERNAL_API_SECRET || !POLYGON_NODE_RPC_URL || !POLYGON_USDC_CONTRACT_ADDRESS || !POLYGON_USDT_CONTRACT_ADDRESS) {
  console.error("CRITICAL: Missing one or more required environment variables for crypto deposit processing (INTERNAL_API_SECRET, POLYGON_NODE_RPC_URL, POLYGON_USDC_CONTRACT_ADDRESS, POLYGON_USDT_CONTRACT_ADDRESS). This endpoint will not function correctly.");
}

// --- ERC20 ABI (Simplified for balanceOf and Transfer event) ---
const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)" // To get token decimals
];

const SUPPORTED_TOKENS_CONFIG = {
  'USDC_POLYGON': { address: POLYGON_USDC_CONTRACT_ADDRESS, symbol: 'USDC', chain: 'Polygon', decimals: 6 }, // Default, will fetch actual
  'USDT_POLYGON': { address: POLYGON_USDT_CONTRACT_ADDRESS, symbol: 'USDT', chain: 'Polygon', decimals: 6 }, // Default, will fetch actual
};

// --- API Key Authentication Middleware (Simplified) ---
const authenticateInternalRequest = (req, res) => {
  const apiKey = req.headers['x-internal-api-key'];
  if (!apiKey || apiKey !== INTERNAL_API_SECRET) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid internal API key.' });
    return false;
  }
  return true;
};

// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!authenticateInternalRequest(req, res)) {
    return; // Authentication failed, response already sent
  }

  if (!POLYGON_NODE_RPC_URL || !POLYGON_USDC_CONTRACT_ADDRESS || !POLYGON_USDT_CONTRACT_ADDRESS || !INTERNAL_API_SECRET) {
    console.error('Process-deposits endpoint called but critical environment variables are missing.');
    return res.status(500).json({ error: 'Service configuration error prevents deposit processing.' });
  }

  let processedDeposits = 0;
  let errorsEncountered = 0;
  const errorDetails = [];

  try {
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_NODE_RPC_URL);

    // 2. Fetch Active Deposit Addresses
    const activeAddressesSnapshot = await db.collection('userCryptoAddresses')
      .where('status', '==', 'active')
      .get();

    if (activeAddressesSnapshot.empty) {
      return res.status(200).json({ success: true, message: 'No active deposit addresses to process.', processedDeposits, errors: errorsEncountered });
    }

    for (const addressDoc of activeAddressesSnapshot.docs) {
      const addressData = addressDoc.data();
      const monitoredAddress = addressData.address;
      const userId = addressData.userId;
      const currency = addressData.currency; // e.g., 'USDC_POLYGON'

      const tokenConfig = SUPPORTED_TOKENS_CONFIG[currency];
      if (!tokenConfig) {
        console.warn(`Unsupported currency ${currency} found for address ${monitoredAddress}. Skipping.`);
        errorDetails.push({ address: monitoredAddress, currency, error: "Unsupported currency configuration." });
        errorsEncountered++;
        continue;
      }

      try {
        const contract = new ethers.Contract(tokenConfig.address, erc20Abi, provider);
        
        // Fetch actual decimals if not hardcoded or to verify
        if (!tokenConfig.decimalsFetched) { // Avoid re-fetching decimals every time
            try {
                const decimals = await contract.decimals();
                tokenConfig.decimals = decimals;
                tokenConfig.decimalsFetched = true; // Mark as fetched
            } catch (decError) {
                console.warn(`Could not fetch decimals for ${tokenConfig.symbol} (${tokenConfig.address}). Using default ${tokenConfig.decimals}. Error: ${decError.message}`);
            }
        }

        const currentBalanceBigNumber = await contract.balanceOf(monitoredAddress);
        // Convert from BigNumber to a number string, then to a number, considering decimals
        const currentBalance = parseFloat(ethers.utils.formatUnits(currentBalanceBigNumber, tokenConfig.decimals));
        
        const lastKnownBalance = parseFloat(addressData.lastKnownBalance) || 0;

        if (currentBalance > lastKnownBalance) {
          const depositAmount = currentBalance - lastKnownBalance;
          const depositAmountSmallestUnit = ethers.utils.parseUnits(depositAmount.toFixed(tokenConfig.decimals), tokenConfig.decimals); // Convert back to BigNumber string in smallest unit

          console.log(`Potential deposit detected for ${userId}, Address: ${monitoredAddress}, Currency: ${currency}, Amount: ${depositAmount}`);

          // V1 Idempotency: Primarily relies on updating lastKnownBalance.
          // A more robust system would involve checking recent Transfer events to get txHashes.
          // For now, we assume any increase is a new deposit to be processed if not seen before.
          // A simple check could be to ensure we don't process if depositAmount is too small (dust).
          if (depositAmount < (1 / Math.pow(10, tokenConfig.decimals))) { // e.g., less than 0.000001 USDC
            console.log(`Deposit amount ${depositAmount} for ${currency} is too small (dust). Skipping.`);
            // Optionally update lastKnownBalance here anyway if desired, or only on successful processing.
            // For now, we'll update it only on successful processing to be safe.
            continue;
          }


          const walletRef = db.collection('userWallets').doc(userId);
          const transactionSubcollectionRef = walletRef.collection('transactions');
          
          // Use a unique ID based on address, currency, and perhaps current balance or a timestamp to make it somewhat idempotent for V1
          // This is NOT a substitute for actual transaction hash idempotency.
          const pseudoIdempotencyKey = `${monitoredAddress}-${currency}-${currentBalance.toFixed(tokenConfig.decimals)}`;
          const newTransactionRef = transactionSubcollectionRef.doc(pseudoIdempotencyKey);


          await db.runTransaction(async (t) => {
            const existingPseudoTx = await t.get(newTransactionRef);
            if (existingPseudoTx.exists) {
                console.warn(`Skipping deposit for ${pseudoIdempotencyKey} as it appears to be already processed (V1 idempotency).`);
                // Update lastKnownBalance even if pseudo-idempotency suggests duplicate, to prevent re-processing this balance state.
                t.update(addressDoc.ref, { lastKnownBalance: currentBalance.toString() }); // store as string to maintain precision
                return;
            }

            const walletDoc = await t.get(walletRef);
            let newCryptoBalances = {};
            if (walletDoc.exists && walletDoc.data().cryptoBalances) {
              newCryptoBalances = walletDoc.data().cryptoBalances;
            }
            
            const currentCryptoBalanceBigNumber = ethers.utils.parseUnits((newCryptoBalances[currency] || '0').toString(), tokenConfig.decimals);
            const newCryptoBalance = currentCryptoBalanceBigNumber.add(depositAmountSmallestUnit);
            newCryptoBalances[currency] = ethers.utils.formatUnits(newCryptoBalance, tokenConfig.decimals); // Store as string number

            const transactionData = {
              type: 'DEPOSIT_CRYPTO',
              status: 'COMPLETED',
              amount: parseFloat(ethers.utils.formatUnits(depositAmountSmallestUnit, tokenConfig.decimals)), // Store human-readable amount
              amountSmallestUnit: depositAmountSmallestUnit.toString(), // Store smallest unit string
              currency: currency,
              userId: userId,
              walletId: userId,
              transactionDate: admin.firestore.FieldValue.serverTimestamp(),
              processedDate: admin.firestore.FieldValue.serverTimestamp(),
              description: `Crypto deposit: ${depositAmount.toFixed(tokenConfig.decimals)} ${tokenConfig.symbol} to ${monitoredAddress}`,
              paymentGatewayDetails: {
                type: 'CRYPTO',
                network: tokenConfig.chain,
                monitoredAddress: monitoredAddress,
                // transactionHash: 'V1_BALANCE_CHANGE_NO_TX_HASH', // Placeholder for V1
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            t.set(newTransactionRef, transactionData); // Using our pseudoIdempotencyKey as doc ID

            if (!walletDoc.exists) {
                t.set(walletRef, { 
                    userId: userId, 
                    balance: 0, // Main fiat balance
                    currency: 'USD', // Main fiat currency
                    cryptoBalances: newCryptoBalances, 
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                t.update(walletRef, { 
                    cryptoBalances: newCryptoBalances, 
                    updatedAt: admin.firestore.FieldValue.serverTimestamp() 
                });
            }
            
            // Update lastKnownBalance on the address document
            t.update(addressDoc.ref, { lastKnownBalance: currentBalance.toString() }); // Store as string
            processedDeposits++;
          });
        } else {
            // If current balance is not greater, ensure lastKnownBalance is synced if it's somehow different (e.g. manual correction)
            if (currentBalance.toString() !== (addressData.lastKnownBalance || '0').toString()) {
                console.log(`Syncing lastKnownBalance for ${monitoredAddress}, currency ${currency}. Old: ${addressData.lastKnownBalance}, New: ${currentBalance.toString()}`);
                await addressDoc.ref.update({ lastKnownBalance: currentBalance.toString() });
            }
        }
      } catch (tokenError) {
        console.error(`Error processing address ${monitoredAddress} for currency ${currency}:`, tokenError);
        errorDetails.push({ address: monitoredAddress, currency, error: tokenError.message });
        errorsEncountered++;
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Deposit processing cycle complete.', 
      processedDeposits, 
      errors: errorsEncountered,
      errorDetails: errorsEncountered > 0 ? errorDetails : undefined,
    });

  } catch (error) {
    console.error('Major error in process-deposits handler:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error: Could not complete deposit processing cycle.', processedDeposits, errors: errorsEncountered, errorDetails });
  }
}
