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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(process.env.NODE_ENV === 'development');

  useEffect(() => {
    // Initialize with demo data in development mode
    if (isDevelopment) {
      setPerformanceMetrics(generateMockMetrics());
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

  // Search for assets (stocks, crypto, bonds)
  const searchAssets = async (query) => {
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        const results = generateMockSearchResults(query);
        setSearchResults(results);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setLoading(false);
        return results;
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/investments/search', {
        ...authHeader,
        params: { query }
      });
      
      setSearchResults(response.data.results);
      return response.data.results;
    } catch (err) {
      console.error('Error searching assets:', err);
      setError('Failed to search assets');
      
      // Fallback to mock results
      const mockResults = generateMockSearchResults(query);
      setSearchResults(mockResults);
      
      return mockResults;
    } finally {
      setLoading(false);
    }
  };

  // Compare multiple assets
  const compareAssets = async (baseTicket, compareTicket, period = '1y') => {
    if (!baseTicket || !compareTicket) return null;
    
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        // Create mock comparison data
        const mockComparison = {
          return_difference: (Math.random() * 20) - 10,
          correlation: Math.random() * 0.8 + 0.2,
          better_risk_adjusted_return: Math.random() > 0.5
        };
        
        setAssetComparisons(mockComparison);
        
        // Also generate price data for both assets
        const mockComparisonData = {
          [baseTicket]: generateMockPriceData(baseTicket, 90),
          [compareTicket]: generateMockPriceData(compareTicket, 90)
        };
        
        setComparisonData(mockComparisonData);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 700));
        
        setLoading(false);
        return { comparisonMetrics: mockComparison, priceData: mockComparisonData };
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/investments/compare', {
        ...authHeader,
        params: { 
          base_ticker: baseTicket,
          compare_ticker: compareTicket,
          period 
        }
      });
      
      setAssetComparisons(response.data.comparison_metrics);
      setComparisonData(response.data.price_data);
      return response.data;
    } catch (err) {
      console.error('Error comparing assets:', err);
      setError('Failed to compare assets');
      
      // Fallback to mock data
      const mockComparison = {
        return_difference: (Math.random() * 20) - 10,
        correlation: Math.random() * 0.8 + 0.2,
        better_risk_adjusted_return: Math.random() > 0.5
      };
      
      setAssetComparisons(mockComparison);
      
      const mockComparisonData = {
        [baseTicket]: generateMockPriceData(baseTicket, 90),
        [compareTicket]: generateMockPriceData(compareTicket, 90)
      };
      
      setComparisonData(mockComparisonData);
      return { comparisonMetrics: mockComparison, priceData: mockComparisonData };
    } finally {
      setLoading(false);
    }
  };

  // Get portfolio summary and performance metrics
  const getPortfolioMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      
      // For development or if user is not authenticated, use mock data
      if (isDevelopment || !currentUser) {
        const mockMetrics = generateMockMetrics();
        setPerformanceMetrics(mockMetrics);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoading(false);
        return mockMetrics;
      }
      
      // For production with authenticated user
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/investments/portfolio/metrics', authHeader);
      
      setPerformanceMetrics(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching portfolio metrics:', err);
      setError('Failed to fetch portfolio metrics');
      
      // Fallback to mock metrics
      const mockMetrics = generateMockMetrics();
      setPerformanceMetrics(mockMetrics);
      
      return mockMetrics;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    currentAsset,
    setCurrentAsset,
    assetData,
    assetMetrics,
    performanceMetrics,
    comparisonData,
    assetComparisons,
    searchResults,
    loading,
    error,
    fetchAssetData,
    searchAssets,
    compareAssets,
    getPortfolioMetrics
  };

  return (
    <InvestmentContext.Provider value={value}>
      {children}
    </InvestmentContext.Provider>
  );
};

export default InvestmentContext;
