from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
from app.routers.auth import verify_token

router = APIRouter()

# Pydantic models will be imported from models module in the future
# For now, defining simplified response models here
class AssetData:
    def __init__(self, ticker, start_date, end_date):
        try:
            self.ticker = ticker
            self.data = yf.download(ticker, start=start_date, end=end_date)
            
            if self.data.empty:
                raise ValueError(f"No data found for ticker {ticker}")
                
            # Calculate basic metrics
            self.calculate_metrics()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Error fetching data: {str(e)}")
    
    def calculate_metrics(self):
        """Calculate investment metrics like returns, volatility, etc."""
        # Calculate daily returns
        self.data['Daily_Return'] = self.data['Adj Close'].pct_change()
        
        # Calculate metrics
        self.total_return = (self.data['Adj Close'].iloc[-1] / self.data['Adj Close'].iloc[0] - 1) * 100
        self.volatility = self.data['Daily_Return'].std() * np.sqrt(252) * 100
        
        # Calculate Sharpe Ratio (assuming risk-free rate of 1%)
        risk_free_rate = 0.01
        self.sharpe_ratio = (self.data['Daily_Return'].mean() * 252 - risk_free_rate) / (self.data['Daily_Return'].std() * np.sqrt(252))
        
        # Calculate Sortino Ratio (downside deviation only)
        negative_returns = self.data['Daily_Return'][self.data['Daily_Return'] < 0]
        downside_deviation = negative_returns.std() * np.sqrt(252)
        self.sortino_ratio = (self.data['Daily_Return'].mean() * 252 - risk_free_rate) / downside_deviation if len(negative_returns) > 0 else np.nan
        
        # Calculate Value at Risk (VaR) at 95% confidence level
        self.var_95 = np.percentile(self.data['Daily_Return'].dropna(), 5) * 100
    
    def get_price_data(self):
        """Get formatted price data for charting"""
        price_data = self.data[['Open', 'High', 'Low', 'Close', 'Volume']].copy()
        price_data.reset_index(inplace=True)
        
        # Format for API response
        result = []
        for _, row in price_data.iterrows():
            result.append({
                'date': row['Date'].strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': float(row['Volume'])
            })
        return result
    
    def get_metrics(self):
        """Get calculated metrics"""
        return {
            'total_return': round(self.total_return, 2),
            'volatility': round(self.volatility, 2),
            'sharpe_ratio': round(self.sharpe_ratio, 2) if not np.isnan(self.sharpe_ratio) else None,
            'sortino_ratio': round(self.sortino_ratio, 2) if not np.isnan(self.sortino_ratio) else None,
            'var_95': round(self.var_95, 2) if not np.isnan(self.var_95) else None
        }

@router.get("/asset/{ticker}")
async def get_asset_data(
    ticker: str,
    period: Optional[str] = Query("1y", description="Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max"),
    user_data = Depends(verify_token)
):
    """
    Get historical data and metrics for a specific asset (stock, crypto, or bond)
    """
    # Calculate start date based on period
    end_date = datetime.now().strftime('%Y-%m-%d')
    
    period_mapping = {
        "1d": timedelta(days=1),
        "5d": timedelta(days=5),
        "1mo": timedelta(days=30),
        "3mo": timedelta(days=90),
        "6mo": timedelta(days=180),
        "1y": timedelta(days=365),
        "5y": timedelta(days=365*5),
        "max": timedelta(days=365*20)  # Default to 20 years for max
    }
    
    start_date = (datetime.now() - period_mapping.get(period, timedelta(days=365))).strftime('%Y-%m-%d')
    
    try:
        asset = AssetData(ticker, start_date, end_date)
        
        return {
            "ticker": ticker,
            "price_data": asset.get_price_data(),
            "metrics": asset.get_metrics(),
            "last_price": float(asset.data['Close'].iloc[-1]) if not asset.data.empty else None,
            "period": period
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing asset data: {str(e)}")

@router.get("/search")
async def search_assets(
    query: str = Query(..., min_length=1, description="Search query for assets"),
    asset_type: Optional[str] = Query(None, description="Asset type: stock, etf, bond, crypto"),
    characteristics: Optional[str] = Query(None, description="Comma-separated characteristics: growth, value, dividend, sovereign, corporate"),
    user_data = Depends(verify_token)
):
    """
    Search for assets (stocks, crypto, bonds) based on query string and filters
    """
    try:
        # Parse characteristics into a list if provided
        characteristics_list = []
        if characteristics:
            characteristics_list = [c.strip().lower() for c in characteristics.split(',')]
        
        # In a real app, we would search through a database
        # Using YFinance for a more comprehensive search
        results = []
        
        # Basic asset types to include more real-world options
        asset_data = {
            "stock": [
                {"ticker": "AAPL", "name": "Apple Inc.", "type": "stock", "exchange": "NASDAQ", "characteristics": ["growth", "technology", "large-cap", "dividend"]},
                {"ticker": "MSFT", "name": "Microsoft Corporation", "type": "stock", "exchange": "NASDAQ", "characteristics": ["growth", "technology", "large-cap", "dividend"]},
                {"ticker": "GOOGL", "name": "Alphabet Inc.", "type": "stock", "exchange": "NASDAQ", "characteristics": ["growth", "technology", "large-cap"]},
                {"ticker": "AMZN", "name": "Amazon.com, Inc.", "type": "stock", "exchange": "NASDAQ", "characteristics": ["growth", "technology", "large-cap"]},
                {"ticker": "TSLA", "name": "Tesla, Inc.", "type": "stock", "exchange": "NASDAQ", "characteristics": ["growth", "automotive", "large-cap"]},
                {"ticker": "JNJ", "name": "Johnson & Johnson", "type": "stock", "exchange": "NYSE", "characteristics": ["value", "healthcare", "large-cap", "dividend"]},
                {"ticker": "JPM", "name": "JPMorgan Chase & Co.", "type": "stock", "exchange": "NYSE", "characteristics": ["value", "financial", "large-cap", "dividend"]},
                {"ticker": "PG", "name": "Procter & Gamble Co.", "type": "stock", "exchange": "NYSE", "characteristics": ["value", "consumer", "large-cap", "dividend"]}
            ],
            "etf": [
                {"ticker": "SPY", "name": "SPDR S&P 500 ETF Trust", "type": "etf", "exchange": "NYSE", "characteristics": ["index", "large-cap", "dividend"]},
                {"ticker": "QQQ", "name": "Invesco QQQ Trust", "type": "etf", "exchange": "NASDAQ", "characteristics": ["index", "technology", "large-cap"]},
                {"ticker": "VTI", "name": "Vanguard Total Stock Market ETF", "type": "etf", "exchange": "NYSE", "characteristics": ["index", "total-market", "dividend"]},
                {"ticker": "SCHD", "name": "Schwab US Dividend Equity ETF", "type": "etf", "exchange": "NYSE", "characteristics": ["dividend", "equity", "value"]},
                {"ticker": "VGT", "name": "Vanguard Information Technology ETF", "type": "etf", "exchange": "NYSE", "characteristics": ["technology", "sector", "growth"]}
            ],
            "bond": [
                {"ticker": "BND", "name": "Vanguard Total Bond Market ETF", "type": "bond", "exchange": "NASDAQ", "characteristics": ["fixed-income", "total-market"]},
                {"ticker": "AGG", "name": "iShares Core U.S. Aggregate Bond ETF", "type": "bond", "exchange": "NYSE", "characteristics": ["fixed-income", "total-market"]},
                {"ticker": "LQD", "name": "iShares iBoxx $ Investment Grade Corporate Bond ETF", "type": "bond", "exchange": "NYSE", "characteristics": ["fixed-income", "corporate"]},
                {"ticker": "MUB", "name": "iShares National Muni Bond ETF", "type": "bond", "exchange": "NYSE", "characteristics": ["fixed-income", "municipal", "tax-exempt"]},
                {"ticker": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "type": "bond", "exchange": "NASDAQ", "characteristics": ["fixed-income", "sovereign", "government", "long-term"]}
            ],
            "crypto": [
                {"ticker": "BTC-USD", "name": "Bitcoin USD", "type": "crypto", "exchange": "CRYPTO", "characteristics": ["digital-asset", "large-cap"]},
                {"ticker": "ETH-USD", "name": "Ethereum USD", "type": "crypto", "exchange": "CRYPTO", "characteristics": ["digital-asset", "large-cap", "smart-contract"]},
                {"ticker": "SOL-USD", "name": "Solana USD", "type": "crypto", "exchange": "CRYPTO", "characteristics": ["digital-asset", "smart-contract"]},
                {"ticker": "ADA-USD", "name": "Cardano USD", "type": "crypto", "exchange": "CRYPTO", "characteristics": ["digital-asset", "smart-contract"]}
            ]
        }
        
        # Filter by asset type if specified
        filtered_assets = []
        if asset_type:
            asset_type = asset_type.lower()
            if asset_type in asset_data:
                filtered_assets.extend(asset_data[asset_type])
        else:
            # If no asset type filter, include all types
            for assets in asset_data.values():
                filtered_assets.extend(assets)
        
        # Filter by query (case-insensitive)
        query = query.lower()
        query_filtered = [
            asset for asset in filtered_assets
            if query in asset["ticker"].lower() or query in asset["name"].lower()
        ]
        
        # Further filter by characteristics if specified
        if characteristics_list:
            results = [
                asset for asset in query_filtered
                if any(char in asset.get("characteristics", []) for char in characteristics_list)
            ]
        else:
            results = query_filtered
        
        # Try to get additional data from YFinance if results are too few
        if not results and query and len(query) >= 2:
            try:
                # Use yfinance to search
                ticker_matches = []
                for possible_ticker in [query.upper(), f"{query.upper()}-USD"]:
                    try:
                        ticker_info = yf.Ticker(possible_ticker)
                        if hasattr(ticker_info, 'info') and ticker_info.info.get('regularMarketPrice'):
                            # It's a valid ticker
                            info = ticker_info.info
                            asset_type_guess = "crypto" if "-USD" in possible_ticker else "stock"
                            if info.get('quoteType') == 'ETF':
                                asset_type_guess = "etf"
                            
                            characteristics = []
                            if info.get('dividendRate'):
                                characteristics.append("dividend")
                            if asset_type_guess == "etf":
                                characteristics.append("index")
                            
                            ticker_matches.append({
                                "ticker": possible_ticker,
                                "name": info.get('longName', info.get('shortName', possible_ticker)),
                                "type": asset_type_guess,
                                "exchange": info.get('exchange', 'UNKNOWN'),
                                "characteristics": characteristics
                            })
                    except:
                        pass
                
                # Add any found tickers to results
                results.extend(ticker_matches)
            except Exception as e:
                # If YFinance search fails, continue with existing results
                print(f"YFinance search error: {str(e)}")
                pass
        
        # Limit results
        return {"results": results[:10]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching assets: {str(e)}")

@router.get("/asset-types")
async def get_asset_types(
    user_data = Depends(verify_token)
):
    """
    Get available asset types and their characteristics for filtering
    """
    return {
        "types": [
            {"id": "stock", "name": "Stocks", "description": "Individual company shares"},
            {"id": "etf", "name": "ETFs", "description": "Exchange Traded Funds"},
            {"id": "bond", "name": "Bonds", "description": "Fixed income securities"},
            {"id": "crypto", "name": "Cryptocurrencies", "description": "Digital assets"}
        ],
        "characteristics": [
            {"id": "growth", "name": "Growth", "description": "Companies expected to grow at an above-average rate"},
            {"id": "value", "name": "Value", "description": "Companies trading at a lower price relative to fundamentals"},
            {"id": "dividend", "name": "Dividend", "description": "Assets that provide regular income"},
            {"id": "index", "name": "Index", "description": "Tracks a market index like S&P 500"},
            {"id": "sector", "name": "Sector", "description": "Focused on a specific sector (e.g., Technology)"},
            {"id": "large-cap", "name": "Large-Cap", "description": "Large market capitalization"},
            {"id": "mid-cap", "name": "Mid-Cap", "description": "Medium market capitalization"},
            {"id": "small-cap", "name": "Small-Cap", "description": "Small market capitalization"},
            {"id": "corporate", "name": "Corporate", "description": "Corporate debt instruments"},
            {"id": "sovereign", "name": "Sovereign", "description": "Government debt instruments"},
            {"id": "municipal", "name": "Municipal", "description": "Municipal debt instruments"},
            {"id": "total-market", "name": "Total Market", "description": "Covers the entire market"},
            {"id": "smart-contract", "name": "Smart Contract", "description": "Platforms with smart contract functionality"}
        ]
    }

@router.get("/compare")
async def compare_assets(
    tickers: str = Query(..., description="Comma-separated list of tickers to compare"),
    period: Optional[str] = Query("1y", description="Time period: 1mo, 3mo, 6mo, 1y, 5y"),
    user_data = Depends(verify_token)
):
    """
    Compare multiple assets based on their key metrics
    """
    ticker_list = [t.strip() for t in tickers.split(",")]
    if len(ticker_list) < 1 or len(ticker_list) > 5:
        raise HTTPException(status_code=400, detail="Please provide between 1 and 5 tickers to compare")
    
    # Calculate dates
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
    
    if period == "3mo":
        start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
    elif period == "6mo":
        start_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
    elif period == "5y":
        start_date = (datetime.now() - timedelta(days=365*5)).strftime('%Y-%m-%d')
    
    results = []
    for ticker in ticker_list:
        try:
            asset = AssetData(ticker, start_date, end_date)
            
            results.append({
                "ticker": ticker,
                "metrics": asset.get_metrics(),
                "last_price": float(asset.data['Close'].iloc[-1]) if not asset.data.empty else None
            })
        except Exception as e:
            results.append({
                "ticker": ticker,
                "error": str(e),
                "metrics": None,
                "last_price": None
            })
    
    return {"assets": results, "period": period}
