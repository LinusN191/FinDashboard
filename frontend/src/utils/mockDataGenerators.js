/**
 * Utility functions for generating mock financial data for development
 * Simulates data structures that would be returned by the backend YFinance integration
 */

/**
 * Generate mock metrics for an asset or portfolio
 * @param {string} ticker - Optional ticker to create specific mock data
 * @returns {Object} Mock financial metrics
 */
export const generateMockMetrics = (ticker = null) => {
  // Volatility should be between 5-40%
  const volatility = Math.random() * 35 + 5;
  
  // Sharpe ratio typically between -1 and 3
  const sharpeRatio = (Math.random() * 4) - 1;
  
  // Beta between 0.5 and 2
  const beta = Math.random() * 1.5 + 0.5;
  
  // Returns between -20% and 50%
  const totalReturn = (Math.random() * 70) - 20;
  const annualizedReturn = (Math.random() * 40) - 10;
  
  // Daily change between -5% and 5%
  const dailyChange = (Math.random() * 10) - 5;
  
  // Portfolio value between $10,000 and $500,000
  const portfolioValue = Math.random() * 490000 + 10000;
  
  // Portfolio allocation - make sure percentages add up to 100%
  const stocksPct = Math.random() * 80;
  const bondsPct = Math.random() * (100 - stocksPct - 5);
  const cashPct = Math.random() * (100 - stocksPct - bondsPct - 2);
  const cryptoPct = 100 - stocksPct - bondsPct - cashPct;
  
  return {
    // Basic metrics
    current_price: ticker === 'AAPL' ? 184.32 : ticker === 'MSFT' ? 415.18 : Math.random() * 1000 + 50,
    change_amount: ticker === 'AAPL' ? 2.54 : ticker === 'MSFT' ? -1.23 : dailyChange,
    change_percentage: ticker === 'AAPL' ? 1.4 : ticker === 'MSFT' ? -0.3 : dailyChange,
    volume: Math.floor(Math.random() * 10000000) + 1000000,
    
    // Risk metrics
    volatility: volatility.toFixed(2),
    beta: beta.toFixed(2),
    sharpe_ratio: sharpeRatio.toFixed(2),
    alpha: (Math.random() * 6 - 2).toFixed(2),
    
    // Return metrics
    total_return: totalReturn.toFixed(2),
    ytd_return: (Math.random() * 30 - 10).toFixed(2),
    one_year_return: (Math.random() * 40 - 15).toFixed(2),
    three_year_return: (Math.random() * 60 - 20).toFixed(2),
    five_year_return: (Math.random() * 100 - 20).toFixed(2),
    annualized_return: annualizedReturn.toFixed(2),
    
    // Portfolio metrics
    portfolio_value: portfolioValue.toFixed(2),
    allocation: {
      stocks: stocksPct.toFixed(2),
      bonds: bondsPct.toFixed(2),
      cash: cashPct.toFixed(2),
      crypto: cryptoPct.toFixed(2)
    },
    
    // Additional YFinance metrics
    dividend_yield: (Math.random() * 5).toFixed(2),
    pe_ratio: (Math.random() * 30 + 5).toFixed(2),
    market_cap: (Math.random() * 2000 + 1).toFixed(2) + "B",
    fifty_two_week_high: (Math.random() * 1500 + 100).toFixed(2),
    fifty_two_week_low: (Math.random() * 100 + 10).toFixed(2),
    
    // Last update timestamp
    last_updated: new Date().toISOString()
  };
};

/**
 * Generate mock price data for an asset
 * @param {string} ticker - Asset ticker symbol
 * @param {number} days - Number of days of price data to generate
 * @returns {Array} Array of price data points
 */
export const generateMockPriceData = (ticker = 'AAPL', days = 90) => {
  const data = [];
  let price = ticker === 'AAPL' ? 180 : 
              ticker === 'MSFT' ? 410 :
              ticker === 'GOOGL' ? 150 :
              ticker.includes('BTC') ? 45000 : 
              Math.random() * 500 + 50;
  
  const volatility = ticker.includes('BTC') ? 0.05 : 0.01; // Higher volatility for crypto
  const trend = Math.random() > 0.5 ? 0.001 : -0.001; // Slight upward or downward trend
  
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random daily change with overall trend
    const change = (Math.random() - 0.5) * volatility * price + trend * price;
    price += change;
    
    // Ensure price doesn't go negative
    price = Math.max(price, 1);
    
    // Calculate daily high, low, open
    const open = price - change;
    const high = Math.max(price, open) * (1 + Math.random() * 0.01);
    const low = Math.min(price, open) * (1 - Math.random() * 0.01);
    
    // Generate volume - higher for well-known stocks
    const volumeBase = ticker === 'AAPL' || ticker === 'MSFT' ? 20000000 : 5000000;
    const volume = Math.floor(Math.random() * volumeBase + volumeBase / 2);
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      adjusted_close: parseFloat(price.toFixed(2)),
      volume: volume
    });
  }
  
  return data;
};

/**
 * Generate mock search results for assets
 * @param {string} query - Search query
 * @returns {Array} Array of asset search results
 */
export const generateMockSearchResults = (query = '') => {
  const query_lower = query.toLowerCase();
  
  const allAssets = [
    // Stocks
    { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth', 'dividend'] },
    { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth', 'dividend'] },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth'] },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth'] },
    { ticker: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth', 'high-volatility'] },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth', 'high-volatility'] },
    { ticker: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth'] },
    { ticker: 'NFLX', name: 'Netflix Inc.', type: 'stock', exchange: 'NASDAQ', characteristics: ['tech', 'growth'] },
    { ticker: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE', characteristics: ['financial', 'growth', 'dividend'] },
    { ticker: 'JNJ', name: 'Johnson & Johnson', type: 'stock', exchange: 'NYSE', characteristics: ['healthcare', 'value', 'dividend'] },
    
    // ETFs
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'etf', exchange: 'NYSE', characteristics: ['index', 'large-cap', 'dividend'] },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', exchange: 'NASDAQ', characteristics: ['index', 'tech', 'growth'] },
    { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', exchange: 'NYSE', characteristics: ['index', 'broad-market', 'dividend'] },
    { ticker: 'ARKK', name: 'ARK Innovation ETF', type: 'etf', exchange: 'NYSE', characteristics: ['active', 'tech', 'growth', 'high-volatility'] },
    { ticker: 'VGT', name: 'Vanguard Information Technology ETF', type: 'etf', exchange: 'NYSE', characteristics: ['sector', 'tech', 'growth'] },
    
    // Bonds
    { ticker: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', type: 'bond', exchange: 'NYSE', characteristics: ['bond', 'broad-market', 'income'] },
    { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'bond', exchange: 'NASDAQ', characteristics: ['bond', 'broad-market', 'income'] },
    { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', type: 'bond', exchange: 'NASDAQ', characteristics: ['bond', 'government', 'long-term'] },
    { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF', type: 'bond', exchange: 'NYSE', characteristics: ['bond', 'corporate', 'investment-grade'] },
    { ticker: 'JNK', name: 'SPDR Bloomberg High Yield Bond ETF', type: 'bond', exchange: 'NYSE', characteristics: ['bond', 'corporate', 'high-yield'] },
    
    // Cryptocurrencies
    { ticker: 'BTC-USD', name: 'Bitcoin USD', type: 'crypto', exchange: 'CRYPTO', characteristics: ['crypto', 'high-volatility'] },
    { ticker: 'ETH-USD', name: 'Ethereum USD', type: 'crypto', exchange: 'CRYPTO', characteristics: ['crypto', 'high-volatility'] },
    { ticker: 'SOL-USD', name: 'Solana USD', type: 'crypto', exchange: 'CRYPTO', characteristics: ['crypto', 'high-volatility'] },
    { ticker: 'ADA-USD', name: 'Cardano USD', type: 'crypto', exchange: 'CRYPTO', characteristics: ['crypto', 'high-volatility'] },
    { ticker: 'XRP-USD', name: 'XRP USD', type: 'crypto', exchange: 'CRYPTO', characteristics: ['crypto', 'high-volatility'] }
  ];
  
  // If query is empty, return some popular assets
  if (!query_lower || query_lower.length < 2) {
    return allAssets.slice(0, 5);
  }
  
  // Filter assets based on query
  return allAssets.filter(asset => 
    asset.ticker.toLowerCase().includes(query_lower) || 
    asset.name.toLowerCase().includes(query_lower)
  );
};

/**
 * Generate mock portfolio data
 * @returns {Object} Mock portfolio data
 */
export const generateMockPortfolio = () => {
  return {
    investments: [
      {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        shares: 10,
        purchase_price: 150.25,
        purchase_date: '2021-06-15',
        current_price: 184.32,
        current_value: 1843.20,
        return_amount: 340.70,
        return_percentage: 22.67
      },
      {
        id: '2',
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
        type: 'stock',
        shares: 5,
        purchase_price: 290.15,
        purchase_date: '2021-08-20',
        current_price: 415.18,
        current_value: 2075.90,
        return_amount: 625.15,
        return_percentage: 43.07
      },
      {
        id: '3',
        ticker: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        type: 'etf',
        shares: 8,
        purchase_price: 420.32,
        purchase_date: '2022-02-10',
        current_price: 471.94,
        current_value: 3775.52,
        return_amount: 412.96,
        return_percentage: 12.29
      },
      {
        id: '4',
        ticker: 'BTC-USD',
        name: 'Bitcoin USD',
        type: 'crypto',
        shares: 0.25,
        purchase_price: 38000,
        purchase_date: '2023-01-05',
        current_price: 45000,
        current_value: 11250,
        return_amount: 1750,
        return_percentage: 18.42
      }
    ],
    summary: {
      total_value: 18944.62,
      total_investment: 15000,
      total_return_amount: 3944.62,
      total_return_percentage: 26.30,
      asset_allocation: {
        stocks: 61.5,
        etfs: 19.93,
        bonds: 0,
        crypto: 18.57
      }
    }
  };
};

/**
 * Generate mock budget data
 * @returns {Object} Mock budget data
 */
export const generateMockBudget = () => {
  return {
    categories: [
      {
        id: '1',
        name: 'Housing',
        planned: 1500,
        actual: 1450,
        difference: 50,
        percentage_used: 96.67
      },
      {
        id: '2',
        name: 'Food & Dining',
        planned: 600,
        actual: 685.32,
        difference: -85.32,
        percentage_used: 114.22
      },
      {
        id: '3',
        name: 'Transportation',
        planned: 350,
        actual: 312.45,
        difference: 37.55,
        percentage_used: 89.27
      },
      {
        id: '4',
        name: 'Entertainment',
        planned: 200,
        actual: 248.90,
        difference: -48.90,
        percentage_used: 124.45
      },
      {
        id: '5',
        name: 'Utilities',
        planned: 250,
        actual: 265.12,
        difference: -15.12,
        percentage_used: 106.05
      }
    ],
    summary: {
      total_planned: 2900,
      total_actual: 2961.79,
      total_difference: -61.79,
      overall_percentage_used: 102.13,
      month: 'May',
      year: 2023
    }
  };
};

/**
 * Generate mock expense data
 * @returns {Array} Array of expense transactions
 */
export const generateMockExpenses = () => {
  return [
    {
      id: '1',
      date: '2023-05-02',
      description: 'Grocery Shopping',
      amount: 85.32,
      category: 'Food & Dining'
    },
    {
      id: '2',
      date: '2023-05-04',
      description: 'Electric Bill',
      amount: 110.45,
      category: 'Utilities'
    },
    {
      id: '3',
      date: '2023-05-05',
      description: 'Movie Tickets',
      amount: 38.50,
      category: 'Entertainment'
    },
    {
      id: '4',
      date: '2023-05-08',
      description: 'Gas',
      amount: 52.15,
      category: 'Transportation'
    },
    {
      id: '5',
      date: '2023-05-10',
      description: 'Restaurant',
      amount: 67.89,
      category: 'Food & Dining'
    },
    {
      id: '6',
      date: '2023-05-15',
      description: 'Rent',
      amount: 1450,
      category: 'Housing'
    }
  ];
};
