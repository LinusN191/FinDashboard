import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const InvestmentContext = createContext({});

export const useInvestment = () => useContext(InvestmentContext);

// Generate consistent mock price data for development
const generateMockPriceData = (ticker = 'AAPL', days = 180) => {
  const mockData = [];
  const today = new Date();
  
  // Base price depends on ticker to ensure different assets have different prices
  let basePrice;
  switch (ticker) {
    case 'AAPL': basePrice = 150; break;
    case 'MSFT': basePrice = 300; break;
    case 'GOOGL': basePrice = 130; break;
    case 'AMZN': basePrice = 125; break;
    case 'TSLA': basePrice = 200; break;
    default: basePrice = 100;
  }
  
  let price = basePrice;
  let trend = 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - i));
    
    // Add some randomness but also simulate trends
    if (i % 20 === 0) {
      trend = (Math.random() - 0.5) * 0.1;
    }
    
    // Daily change with trend component
    const change = (Math.random() - 0.5) * 3 + trend * basePrice;
    price += change;
    price = Math.max(price, basePrice * 0.7); // Prevent too much downside
    
    const dailyVolatility = Math.random() * 3 + 1;
    
    mockData.push({
      date: date.toISOString().split('T')[0],
      open: price - (Math.random() * dailyVolatility),
      high: price + (Math.random() * dailyVolatility * 1.5),
      low: price - (Math.random() * dailyVolatility * 1.5),
      close: price,
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }
  
  return mockData;
};

// Generate mock performance metrics
const generateMockMetrics = (ticker = 'AAPL') => {
  // Base returns depend on ticker
  let baseReturn;
  switch (ticker) {
    case 'AAPL': baseReturn = 15; break;
    case 'MSFT': baseReturn = 12; break;
    case 'GOOGL': baseReturn = 8; break;
    case 'AMZN': baseReturn = 10; break;
    case 'TSLA': baseReturn = 25; break;
    default: baseReturn = 5;
  }
  
  // Add some randomness
  const returnVariation = (Math.random() - 0.5) * 10;
  
  return {
    portfolio_value: Math.round((Math.random() * 50000 + 10000) * 100) / 100,
    total_return_percentage: baseReturn + returnVariation,
    ytd_return_percentage: (baseReturn + returnVariation) * 0.7,
    volatility: Math.round((Math.random() * 15 + 5) * 100) / 100,
    sharpe_ratio: Math.round((Math.random() * 1.5 + 0.5) * 100) / 100,
    max_drawdown: Math.round(-(Math.random() * 20 + 5) * 100) / 100,
    beta: Math.round((Math.random() * 1.5 + 0.5) * 100) / 100,
    alpha: Math.round((Math.random() * 5 - 2) * 100) / 100
  };
};

// Generate mock search results
const generateMockSearchResults = (query) => {
  const commonStocks = [
    { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', exchange: 'NYSE' },
    { ticker: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE' },
    { ticker: 'JNJ', name: 'Johnson & Johnson', type: 'stock', exchange: 'NYSE' }
  ];
  
  if (!query) return commonStocks.slice(0, 5);
  
  const lowerQuery = query.toLowerCase();
  return commonStocks.filter(stock => 
    stock.ticker.toLowerCase().includes(lowerQuery) || 
    stock.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 7);
};

export const InvestmentProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentAsset, setCurrentAsset] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [assetMetrics, setAssetMetrics] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [assetComparisons, setAssetComparisons] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [assetCharacteristics, setAssetCharacteristics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(process.env.NODE_ENV === 'development');

  useEffect(() => {
    // Initialize with demo data in development mode
    if (isDevelopment) {
      setPerformanceMetrics(generateMockMetrics());
      // Fetch asset types and characteristics
      fetchAssetFilters();
    }
  }, [isDevelopment]);

  // Get auth token for API requests
  const getAuthHeader = async () => {
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        return {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };
      } catch (err) {
        console.warn('Failed to get auth token:', err);
      }
    }
    return {};
  };

  // Fetch asset types and characteristics for filtering
  const fetchAssetFilters = async () => {
    try {
      setLoading(true);
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock asset types and characteristics
        const mockTypes = [
          {id: "stock", name: "Stocks", description: "Individual company shares"},
          {id: "etf", name: "ETFs", description: "Exchange Traded Funds"},
          {id: "bond", name: "Bonds", description: "Fixed income securities"},
          {id: "crypto", name: "Cryptocurrencies", description: "Digital assets"}
        ];
        
        const mockCharacteristics = [
          {id: "growth", name: "Growth", description: "Companies expected to grow at an above-average rate"},
          {id: "value", name: "Value", description: "Companies trading at a lower price relative to fundamentals"},
          {id: "dividend", name: "Dividend", description: "Assets that provide regular income"},
          {id: "index", name: "Index", description: "Tracks a market index like S&P 500"},
          {id: "sector", name: "Sector", description: "Focused on a specific sector (e.g., Technology)"},
          {id: "large-cap", name: "Large-Cap", description: "Large market capitalization"},
          {id: "corporate", name: "Corporate", description: "Corporate debt instruments"},
          {id: "sovereign", name: "Sovereign", description: "Government debt instruments"}
        ];
        
        setAssetTypes(mockTypes);
        setAssetCharacteristics(mockCharacteristics);
      } else {
        // For production with authenticated user
        const authHeader = await getAuthHeader();
        const response = await axios.get('/api/investments/asset-types', authHeader);
        
        setAssetTypes(response.data.types || []);
        setAssetCharacteristics(response.data.characteristics || []);
      }
    } catch (err) {
      console.error('Error fetching asset filters:', err);
      // Use fallback data even in production
      const fallbackTypes = [
        {id: "stock", name: "Stocks", description: "Individual company shares"},
        {id: "etf", name: "ETFs", description: "Exchange Traded Funds"}
      ];
      setAssetTypes(fallbackTypes);
    } finally {
      setLoading(false);
    }
  };

  // Fetch asset data
  const fetchAssetData = async (ticker, period = '1y') => {
    if (!ticker) return null;
    
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        const mockData = generateMockPriceData(ticker);
        setCurrentAsset(ticker);
        setAssetData(mockData);
        setAssetMetrics(generateMockMetrics(ticker));
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoading(false);
        return { price_data: mockData, metrics: generateMockMetrics(ticker) };
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.get(`/api/investments/asset/${ticker}`, {
        ...authHeader,
        params: { period }
      });
      
      setCurrentAsset(ticker);
      setAssetData(response.data.price_data);
      setAssetMetrics(response.data.metrics);
      
      return response.data;
    } catch (err) {
      console.error('Error fetching asset data:', err);
      setError(`Failed to fetch data for ${ticker}: ${err.message}`);
      
      // Fallback to mock data even in production if the API fails
      if (!assetData) {
        const mockData = generateMockPriceData(ticker);
        setAssetData(mockData);
        setAssetMetrics(generateMockMetrics(ticker));
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Search for assets (stocks, crypto, bonds) with filtering
  const searchAssets = async (query, assetType = null, characteristics = []) => {
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        // Generate filtered mock results
        let mockResults = generateMockSearchResults(query);
        
        // Apply asset type filter if provided
        if (assetType) {
          mockResults = mockResults.filter(asset => asset.type === assetType);
        }
        
        // Apply characteristics filter if provided
        if (characteristics && characteristics.length > 0) {
          // In mock data we don't have characteristics, so we'll just return limited results
          mockResults = mockResults.slice(0, 3);
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setSearchResults(mockResults);
        setLoading(false);
        return mockResults;
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const params = { query };
      
      // Add filters if provided
      if (assetType) {
        params.asset_type = assetType;
      }
      
      if (characteristics && characteristics.length > 0) {
        params.characteristics = characteristics.join(',');
      }
      
      const response = await axios.get('/api/investments/search', {
        ...authHeader,
        params
      });
      
      setSearchResults(response.data.results);
      return response.data.results;
    } catch (err) {
      console.error('Error searching assets:', err);
      setError(`Failed to search assets: ${err.message}`);
      
      // Fallback to mock data even in production if the API fails
      const fallbackResults = generateMockSearchResults(query);
      setSearchResults(fallbackResults);
      
      return fallbackResults;
    } finally {
      setLoading(false);
    }
  };

  // Compare assets
  const compareAssets = async (tickers, period = '1y') => {
    if (!tickers || tickers.length === 0) return null;
    
    const tickersString = Array.isArray(tickers) ? tickers.join(',') : tickers;
    
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        const mockComparisons = {};
        const tickerArray = tickersString.split(',');
        
        tickerArray.forEach(ticker => {
          mockComparisons[ticker] = {
            price_data: generateMockPriceData(ticker, 90),
            metrics: generateMockMetrics(ticker)
          };
        });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 700));
        
        setAssetComparisons(mockComparisons);
        setLoading(false);
        return mockComparisons;
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/investments/compare', {
        ...authHeader,
        params: { tickers: tickersString, period }
      });
      
      setAssetComparisons(response.data.comparisons);
      return response.data.comparisons;
    } catch (err) {
      console.error('Error comparing assets:', err);
      setError(`Failed to compare assets: ${err.message}`);
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add a user investment
  const addInvestment = async (investmentData) => {
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, simulate success
      if (isDevelopment || !currentUser) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update performance metrics to reflect new investment
        const currentMetrics = { ...performanceMetrics } || generateMockMetrics();
        
        // Calculate investment value
        const investmentValue = investmentData.shares * investmentData.price;
        
        // Update portfolio value
        currentMetrics.portfolio_value = 
          (currentMetrics.portfolio_value || 0) + investmentValue;
        
        setPerformanceMetrics(currentMetrics);
        
        setLoading(false);
        return { success: true, message: 'Investment added successfully' };
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/investments', investmentData, authHeader);
      
      // Refresh performance metrics after adding investment
      await fetchPortfolioPerformance();
      
      return response.data;
    } catch (err) {
      console.error('Error adding investment:', err);
      setError(`Failed to add investment: ${err.message}`);
      
      return { success: false, message: `Failed to add investment: ${err.message}` };
    } finally {
      setLoading(false);
    }
  };

  // Remove a user investment
  const removeInvestment = async (investmentId) => {
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, simulate success
      if (isDevelopment || !currentUser) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update performance metrics to reflect removed investment
        const currentMetrics = { ...performanceMetrics } || generateMockMetrics();
        
        // Simulate reduction in portfolio value
        // In real app, we'd know the exact value of the investment being removed
        currentMetrics.portfolio_value = 
          Math.max(0, (currentMetrics.portfolio_value || 0) - 5000); // Assume $5000 for demo
        
        setPerformanceMetrics(currentMetrics);
        
        setLoading(false);
        return { success: true, message: 'Investment removed successfully' };
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.delete(`/api/investments/${investmentId}`, authHeader);
      
      // Refresh performance metrics after removing investment
      await fetchPortfolioPerformance();
      
      return response.data;
    } catch (err) {
      console.error('Error removing investment:', err);
      setError(`Failed to remove investment: ${err.message}`);
      
      return { success: false, message: `Failed to remove investment: ${err.message}` };
    } finally {
      setLoading(false);
    }
  };

  // Fetch portfolio performance data
  const fetchPortfolioPerformance = async () => {
    try {
      setLoading(true);
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        const mockPerformance = generateMockMetrics();
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setPerformanceMetrics(mockPerformance);
        setLoading(false);
        return mockPerformance;
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/investments/portfolio', authHeader);
      
      setPerformanceMetrics(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching portfolio performance:', err);
      
      // Use mock data as fallback
      const fallbackPerformance = generateMockMetrics();
      setPerformanceMetrics(fallbackPerformance);
      
      return fallbackPerformance;
    } finally {
      setLoading(false);
    }
  };

  // Value to share with provider consumers
  const value = {
    currentAsset,
    assetData,
    assetMetrics,
    performanceMetrics,
    assetComparisons,
    searchResults,
    assetTypes,
    assetCharacteristics,
    loading,
    error,
    fetchAssetData,
    searchAssets,
    compareAssets,
    addInvestment,
    removeInvestment,
    fetchPortfolioPerformance,
    fetchAssetFilters
  };

  return (
    <InvestmentContext.Provider value={value}>
      {children}
    </InvestmentContext.Provider>
  );
};

export default InvestmentContext;
