import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useToast } from '@chakra-ui/react';

const InvestmentContext = createContext({});

export const useInvestment = () => useContext(InvestmentContext);

// --- MOCK DATA GENERATORS (Keep for development/fallback) ---
const generateMockPriceData = (ticker = 'AAPL', days = 180) => {
  const mockData = [];
  const today = new Date();
  let basePrice;
  switch (ticker) {
    case 'AAPL': basePrice = 150; break;
    case 'MSFT': basePrice = 300; break;
    default: basePrice = 100;
  }
  let price = basePrice;
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - i));
    price += (Math.random() - 0.5) * 3 + ((i % 20 === 0) ? (Math.random() - 0.5) * 0.1 * basePrice : 0);
    price = Math.max(price, basePrice * 0.7);
    const dailyVolatility = Math.random() * 3 + 1;
    mockData.push({
      date: date.toISOString().split('T')[0],
      open: price - (Math.random() * dailyVolatility), high: price + (Math.random() * dailyVolatility * 1.5),
      low: price - (Math.random() * dailyVolatility * 1.5), close: price,
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }
  return mockData;
};
const generateMockMetrics = (ticker = 'AAPL') => ({ /* ... existing mock metrics ... */ });
const generateMockSearchResults = (query) => ({ /* ... existing mock search results ... */ });


export const InvestmentProvider = ({ children }) => {
  const { currentUser, getIdToken } = useAuth(); // Ensure getIdToken is from useAuth
  const toast = useToast();

  // Existing state
  const [currentAsset, setCurrentAsset] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [assetMetrics, setAssetMetrics] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [assetComparisons, setAssetComparisons] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(process.env.NODE_ENV === 'development');

  // Manually added assets
  const [investmentAssets, setInvestmentAssets] = useState([]);
  const [loadingInvestmentAssets, setLoadingInvestmentAssets] = useState(false);
  const [assetOperationLoading, setAssetOperationLoading] = useState(false);
  const [assetOperationError, setAssetOperationError] = useState(null);

  // Price refresh state
  const [isPriceRefreshing, setIsPriceRefreshing] = useState(false);
  const [priceRefreshError, setPriceRefreshError] = useState(null);

  // --- New State Variables for Exchange Assets ---
  const [exchangeAssets, setExchangeAssets] = useState([]);
  const [isLoadingExchangeAssets, setIsLoadingExchangeAssets] = useState(false);
  const [exchangeAssetError, setExchangeAssetError] = useState(null);


  // Helper to get auth token
  const getAuthHeader = useCallback(async () => {
    if (currentUser && getIdToken) {
      try {
        const token = await getIdToken();
        return { headers: { Authorization: `Bearer ${token}` } };
      } catch (err) {
        console.warn('Failed to get auth token:', err);
        // Do not toast here, let calling function handle errors specific to its context
      }
    }
    return {}; // Return empty object if no user or getIdToken
  }, [currentUser, getIdToken]);


  // Fetch manually added investment assets
  const fetchInvestmentAssets = useCallback(async () => {
    if (!currentUser) return;
    setLoadingInvestmentAssets(true);
    setAssetOperationError(null);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader.headers?.Authorization) throw new Error("User not authenticated or token unavailable.");
      const response = await axios.get('/api/investments/assets', authHeader);
      setInvestmentAssets(response.data || []);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch manual investments.';
      setAssetOperationError(errMsg);
      // Toasting here might be too noisy if called frequently or on initial load with other fetches
    } finally {
      setLoadingInvestmentAssets(false);
    }
  }, [currentUser, getAuthHeader]);


  // --- New Function: fetchAllExchangeAssets ---
  const fetchAllExchangeAssets = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingExchangeAssets(true);
    setExchangeAssetError(null);
    let aggregatedAssets = [];
    let encounteredErrors = [];

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader.headers?.Authorization) {
        throw new Error("User not authenticated or token unavailable for fetching connections.");
      }
      
      const connectionsResponse = await axios.get('/api/exchanges/connections', authHeader);
      const activeConnections = (connectionsResponse.data || []).filter(conn => conn.status === 'active');

      if (activeConnections.length === 0) {
        setExchangeAssets([]);
        setIsLoadingExchangeAssets(false);
        return;
      }

      for (const conn of activeConnections) {
        try {
          const portfolioResponse = await axios.get(`/api/exchanges/portfolio/${conn.id}`, authHeader);
          if (portfolioResponse.data.success && portfolioResponse.data.exchangePortfolio) {
            const assetsWithSource = portfolioResponse.data.exchangePortfolio.map(asset => ({
              ...asset,
              sourceConnectionId: conn.id,
              // Ensure a unique ID for React keys. Using sourceAssetId which should be unique within that exchange.
              // The API provides `sourceAssetId`. We can use a composite for global uniqueness if needed.
              uniqueDisplayId: `${conn.id}-${asset.sourceAssetId || asset.symbol}`, 
            }));
            aggregatedAssets = aggregatedAssets.concat(assetsWithSource);
          }
        } catch (portfolioError) {
          const errMsg = portfolioError.response?.data?.error || portfolioError.message || `Failed to fetch portfolio for ${conn.exchangeName}.`;
          console.error(`Error fetching portfolio for ${conn.exchangeName} (ID: ${conn.id}):`, errMsg);
          encounteredErrors.push({ exchangeName: conn.exchangeName, error: errMsg });
        }
      }

      setExchangeAssets(aggregatedAssets);

      if (encounteredErrors.length > 0) {
        const errorSummary = encounteredErrors.map(e => `${e.exchangeName}: ${e.error}`).join('; ');
        setExchangeAssetError(`Errors fetching from some exchanges: ${errorSummary}`);
        toast({
          title: 'Partial Success Fetching Exchange Assets',
          description: `Successfully fetched from some exchanges, but encountered errors with others. Check console for details.`,
          status: 'warning',
          duration: 7000,
          isClosable: true,
        });
      }
      // No success toast here to avoid being too chatty, focus on errors.
    } catch (err) { // Error fetching connections list itself
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch exchange connections list.';
      setExchangeAssetError(errMsg);
      setExchangeAssets([]);
      toast({ title: 'Error Fetching Exchange Data', description: errMsg, status: 'error', duration: 7000, isClosable: true });
    } finally {
      setIsLoadingExchangeAssets(false);
    }
  }, [currentUser, getAuthHeader, toast]);


  useEffect(() => {
    if (isDevelopment && !currentUser) { // For dev mode, allow some features without login
      setPerformanceMetrics(generateMockMetrics());
    }
    if (currentUser) {
      fetchInvestmentAssets();
      fetchAllExchangeAssets(); // Fetch exchange assets on user login
    } else {
      setInvestmentAssets([]);
      setExchangeAssets([]);
      setExchangeAssetError(null);
      setAssetOperationError(null);
      setWalletBalance(null); // Assuming wallet context might be separate or managed here if combined
      // Clear other relevant states
    }
  }, [currentUser, isDevelopment, fetchInvestmentAssets, fetchAllExchangeAssets]); // Add fetchAllExchangeAssets


  // --- Existing CRUD functions (addInvestmentAsset, updateInvestmentAsset, deleteInvestmentAsset, refreshInvestmentPrices) ---
  // Assume they are defined here and work as before.
  // For brevity, their full code is not repeated but they should be present.
  const addInvestmentAsset = async (assetData) => { /* ... */ };
  const updateInvestmentAsset = async (assetId, updates) => { /* ... */ };
  const deleteInvestmentAsset = async (assetId) => { /* ... */ };
  const refreshInvestmentPrices = async () => { /* ... existing logic, ensure it calls fetchInvestmentAssets AND fetchAllExchangeAssets after price updates if applicable */
    if (!currentUser) throw new Error("User not authenticated");
    setIsPriceRefreshing(true);
    setPriceRefreshError(null);
    try {
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/investments/update-prices', {}, authHeader);
      // ... (toast logic from previous step) ...
      toast({ title: 'Price Refresh Triggered', description: 'Manual asset prices will be updated. Exchange assets update via their source.', status: 'info', duration: 5000, isClosable: true });

      await fetchInvestmentAssets(); // Re-fetch manual assets
      // Consider if exchange assets need re-fetching or if their prices are live from exchange API
      // For now, only manual assets are directly updated by this specific call.
      // If /api/investments/update-prices also updates exchange-linked assets in our DB (it doesn't currently), then fetchAllExchangeAssets would be needed.
      return response.data;
    } catch (err) {
      // ... (error handling) ...
      throw err;
    } finally {
      setIsPriceRefreshing(false);
    }
  };


  // --- Existing other functions (fetchAssetData, searchAssets, compareAssets, getPortfolioMetrics) ---
  // Assume they are defined here. For brevity, not repeated.
  const fetchAssetData = async (ticker, period = '1y') => { /* ... */ };
  const searchAssets = async (query) => { /* ... */ };
  const compareAssets = async (baseTicket, compareTicket, period = '1y') => { /* ... */ };
  const getPortfolioMetrics = async () => { /* ... */ };


  const value = {
    currentUser, // Make sure currentUser is passed if needed by consumers directly
    // Existing values
    currentAsset, setCurrentAsset, assetData, assetMetrics, performanceMetrics,
    comparisonData, assetComparisons, searchResults, loading, error,
    fetchAssetData, searchAssets, compareAssets, getPortfolioMetrics,

    // Manually added assets
    investmentAssets, loadingInvestmentAssets, assetOperationLoading, assetOperationError,
    fetchInvestmentAssets, addInvestmentAsset, updateInvestmentAsset, deleteInvestmentAsset,

    // Price Refresh
    isPriceRefreshing, priceRefreshError, refreshInvestmentPrices,

    // --- New Values for Exchange Assets ---
    exchangeAssets,
    isLoadingExchangeAssets,
    exchangeAssetError,
    fetchAllExchangeAssets, // Expose the manual trigger
  };

  return (
    <InvestmentContext.Provider value={value}>
      {children}
    </InvestmentContext.Provider>
  );
};

export default InvestmentContext;

// Dummy definitions for functions not being fully re-implemented in this diff for brevity
// In the actual file, these would contain their full existing logic.
// const addInvestmentAsset = async (assetData) => { console.log('addInvestmentAsset called', assetData); };
// const updateInvestmentAsset = async (assetId, updates) => { console.log('updateInvestmentAsset called', assetId, updates); };
// const deleteInvestmentAsset = async (assetId) => { console.log('deleteInvestmentAsset called', assetId); };
// const fetchAssetData = async (ticker, period = '1y') => { console.log('fetchAssetData called', ticker, period); return { price_data: [], metrics: {} }; };
// const searchAssets = async (query) => { console.log('searchAssets called', query); return []; };
// const compareAssets = async (baseTicket, compareTicket, period = '1y') => { console.log('compareAssets called', baseTicket, compareTicket, period); return { comparison_metrics: {}, price_data: {} }; };
// const getPortfolioMetrics = async () => { console.log('getPortfolioMetrics called'); return {}; };
// const WalletBalance = null; // Placeholder, assuming it's from WalletContext if used.
// Remove this line if WalletBalance is not a state variable here
const setWalletBalance = (value) => console.log('setWalletBalance called with', value);
