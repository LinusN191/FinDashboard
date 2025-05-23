import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useToast } from '@chakra-ui/react';

// 1. Context Setup
const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // 3. Dependencies
  const { currentUser, getIdToken } = useAuth();
  const toast = useToast();

  // 2. State Variables
  const [walletBalance, setWalletBalance] = useState(null); // For fiat balance { amount, currency }
  const [transactions, setTransactions] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(false); // Covers both fiat and crypto for now
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [walletError, setWalletError] = useState(null); // General error for fiat/stripe/crypto actions
  const [transactionPagination, setTransactionPagination] = useState({
    lastVisibleId: null,
    hasMore: true,
  });
  const [isSubmittingWalletAction, setIsSubmittingWalletAction] = useState(false);

  // --- New State for Crypto Balances ---
  const [cryptoBalancesData, setCryptoBalancesData] = useState(null); // e.g., { USDC_POLYGON: '123.45', ... } (amounts as strings from API, in human-readable units)
  // Note: loadingCryptoBalances and cryptoBalancesError are not added as separate states.
  // We'll use loadingBalance and walletError for simplicity for now, as they are fetched together.
  // If separate loading/error states for crypto become necessary, they can be added.

  // --- New State for Deposit Address Fetching ---
  const [isFetchingDepositAddress, setIsFetchingDepositAddress] = useState(false);


  // 4. Core Functions

  // Helper to get auth token
  const getAuthHeader = useCallback(async () => {
    if (currentUser && getIdToken) {
      try {
        const token = await getIdToken();
        return { headers: { Authorization: `Bearer ${token}` } };
      } catch (err) {
        console.warn('Failed to get auth token:', err);
        setWalletError('Failed to authenticate for wallet actions.');
        throw new Error("Authentication token not available.");
      }
    }
    throw new Error("User not authenticated.");
  }, [currentUser, getIdToken]);


  // Modified Fetch Wallet Balance (to include crypto)
  const fetchWalletBalance = useCallback(async () => {
    if (!currentUser) return;
    setLoadingBalance(true);
    setWalletError(null);
    try {
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/wallet/balance', authHeader);
      // Assuming API response is now: 
      // { fiatBalance: { amount, currency }, cryptoBalances: { USDC_POLYGON: amountInSmallestUnit, ... } }
      // OR, if /api/wallet/balance ONLY returns fiat, and crypto is separate:
      // For this implementation, we assume /api/wallet/balance returns the structure:
      // { balance: amountInCents, currency: 'USD', cryptoBalances: { 'USDC_POLYGON': '123456789', ... } }
      // where crypto balances are strings representing smallest unit.
      
      setWalletBalance({ amount: response.data.balance, currency: response.data.currency });
      
      if (response.data.cryptoBalances) {
        // Convert crypto balances from smallest unit strings to human-readable numbers for context state
        const formattedCryptoBalances = {};
        for (const key in response.data.cryptoBalances) {
          // This part would need token decimal info, which is not directly available here.
          // For simplicity, if API returns smallest unit, context might store it as is,
          // and UI would format it using known decimals.
          // OR, API for /wallet/balance could return human-readable strings directly.
          // Let's assume API returns human-readable strings for cryptoBalances for now.
          // If it returns smallest units, this needs adjustment or UI needs to handle formatting.
          // Based on task: "amounts as strings from API, in human-readable units" for `cryptoBalancesData`
          formattedCryptoBalances[key] = response.data.cryptoBalances[key]; 
        }
        setCryptoBalancesData(formattedCryptoBalances);
      } else {
        setCryptoBalancesData({}); // Default to empty object
      }

    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch wallet balances.';
      setWalletError(errMsg);
      // No toast for initial load errors usually
    } finally {
      setLoadingBalance(false);
    }
  }, [currentUser, getAuthHeader]);

  // Fetch Transactions (No major changes needed for this subtask, but ensure it's robust)
  const fetchTransactions = useCallback(async (limit = 10, loadMore = false) => {
    if (!currentUser) return;
    setLoadingTransactions(true);
    setWalletError(null); 
    try {
      const authHeader = await getAuthHeader();
      const params = { limit };
      if (loadMore && transactionPagination.lastVisibleId) {
        params.startAfterTransactionId = transactionPagination.lastVisibleId;
      }

      const response = await axios.get('/api/wallet/transactions', { ...authHeader, params });
      const fetchedTransactions = response.data.transactions || [];

      if (loadMore) {
        setTransactions(prev => [...prev, ...fetchedTransactions]);
      } else {
        setTransactions(fetchedTransactions);
      }

      if (fetchedTransactions.length > 0) {
        setTransactionPagination({
          lastVisibleId: fetchedTransactions[fetchedTransactions.length - 1].id,
          hasMore: fetchedTransactions.length === limit,
        });
      } else {
        setTransactionPagination(prev => ({ ...prev, hasMore: false }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch transactions.';
      setWalletError(errMsg);
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentUser, getAuthHeader, transactionPagination.lastVisibleId]);

  // Existing Deposit Funds (Fiat - non-Stripe)
  const depositFunds = async (amountInSmallestUnit, currency = 'USD') => { /* ... existing ... */ };

  // Existing Withdraw Funds (Fiat)
  const withdrawFunds = async (amountInSmallestUnit, currency = 'USD') => { /* ... existing ... */ };

  // Existing Initiate Stripe Deposit
  const initiateStripeDeposit = async (amountInDollars) => { /* ... existing ... */ };

  // --- New Function: Fetch Crypto Deposit Address ---
  const fetchCryptoDepositAddress = async (currency) => {
    if (!currentUser) {
        toast({ title: 'Authentication Error', description: 'Please log in.', status: 'error', duration: 5000, isClosable: true });
        return { success: false, error: "User not authenticated" };
    }
    if (!currency) {
        toast({ title: 'Currency Required', description: 'Please specify a currency.', status: 'warning', duration: 5000, isClosable: true });
        return { success: false, error: "Currency not specified" };
    }
    setIsFetchingDepositAddress(true);
    setWalletError(null);
    try {
        const authHeader = await getAuthHeader();
        const response = await axios.get(`/api/wallet/crypto/deposit-address?currency=${currency}`, authHeader);
        // API returns { success: true, currency, address }
        toast({ title: `Deposit Address for ${response.data.currency}`, description: `Address: ${response.data.address}`, status: 'success', duration: 10000, isClosable: true });
        return { success: true, address: response.data.address, currency: response.data.currency };
    } catch (err) {
        const errMsg = err.response?.data?.error || err.message || `Failed to fetch deposit address for ${currency}.`;
        setWalletError(errMsg);
        toast({ title: 'Fetch Address Failed', description: errMsg, status: 'error', duration: 7000, isClosable: true });
        return { success: false, error: errMsg };
    } finally {
        setIsFetchingDepositAddress(false);
    }
  };

  // --- New Function: Initiate Crypto Withdrawal ---
  const initiateCryptoWithdrawal = async (amountInSmallestUnit, currency, toAddress) => {
    if (!currentUser) {
        toast({ title: 'Authentication Error', description: 'Please log in.', status: 'error', duration: 5000, isClosable: true });
        return { success: false, error: "User not authenticated" };
    }
    if (amountInSmallestUnit <= 0 || !currency || !toAddress) {
        toast({ title: 'Invalid Withdrawal Details', description: 'Amount, currency, and recipient address are required.', status: 'warning', duration: 5000, isClosable: true });
        return { success: false, error: "Invalid withdrawal details" };
    }

    setIsSubmittingWalletAction(true);
    setWalletError(null);
    try {
        const authHeader = await getAuthHeader();
        const response = await axios.post('/api/wallet/crypto/withdraw', 
            { amount: amountInSmallestUnit, currency, toAddress }, 
            authHeader
        );
        // API returns { success: true, message, internalTransactionId, transactionHash }
        toast({ title: 'Withdrawal Initiated', description: `${response.data.message || 'Processing...'}. TxID: ${response.data.transactionHash || response.data.internalTransactionId}`, status: 'success', duration: 10000, isClosable: true });
        await fetchWalletBalance(); // Refresh fiat and crypto balances
        await fetchTransactions(10, false); // Refresh transactions
        return { success: true, transactionHash: response.data.transactionHash, internalTransactionId: response.data.internalTransactionId };
    } catch (err) {
        const errMsg = err.response?.data?.error || err.message || 'Crypto withdrawal failed.';
        setWalletError(errMsg);
        toast({ title: 'Crypto Withdrawal Failed', description: errMsg, status: 'error', duration: 7000, isClosable: true });
        // Optionally refresh balance even on failure if the pre-broadcast debit occurred but broadcast failed.
        await fetchWalletBalance(); 
        return { success: false, error: errMsg };
    } finally {
      setIsSubmittingWalletAction(false);
    }
  };

  // useEffect for Initial Data Load
  useEffect(() => {
    if (currentUser) {
      fetchWalletBalance(); // This now fetches both fiat and crypto balances
      fetchTransactions(10, false);
    } else {
      setWalletBalance(null);
      setCryptoBalancesData(null); // Clear crypto balances on logout
      setTransactions([]);
      setTransactionPagination({ lastVisibleId: null, hasMore: true });
      setWalletError(null);
      // setCryptoBalancesError(null); // Using general walletError for now
      setIsSubmittingWalletAction(false); 
      setIsFetchingDepositAddress(false);
    }
  }, [currentUser, fetchWalletBalance, fetchTransactions]);

  // Provider Value
  const value = {
    walletBalance, // Fiat balance { amount, currency }
    cryptoBalancesData, // Crypto balances { USDC_POLYGON: amountStr, ... }
    transactions,
    loadingBalance, // Shared for fiat and crypto for now
    // loadingCryptoBalances, // Not a separate state currently
    loadingTransactions,
    walletError, // Shared error state for now
    // cryptoBalancesError, // Not a separate state currently
    transactionPagination,
    isSubmittingWalletAction, // For all wallet submit actions
    isFetchingDepositAddress, // Specific for crypto deposit address fetching
    
    fetchWalletBalance,
    fetchTransactions,
    depositFunds, 
    withdrawFunds,
    initiateStripeDeposit,
    fetchCryptoDepositAddress, // New
    initiateCryptoWithdrawal, // New
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Dummy implementations for existing functions if not fully included above, for context
// const depositFunds = async (amountInSmallestUnit, currency = 'USD') => { /* ... */ };
// const withdrawFunds = async (amountInSmallestUnit, currency = 'USD') => { /* ... */ };
// const initiateStripeDeposit = async (amountInDollars) => { /* ... */ };


export default WalletContext;
