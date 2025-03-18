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
    user_data = Depends(verify_token)
):
    """
    Search for assets (stocks, crypto, bonds) based on a query string
    """
    # In a production app, this would use a proper search API
    # This is a simplified mock implementation
    # Common tickers for demo purposes
    common_assets = {
        "AAPL": "Apple Inc.",
        "MSFT": "Microsoft Corporation",
        "GOOGL": "Alphabet Inc.",
        "AMZN": "Amazon.com, Inc.",
        "TSLA": "Tesla, Inc.",
        "BTC-USD": "Bitcoin USD",
        "ETH-USD": "Ethereum USD",
        "SPY": "SPDR S&P 500 ETF Trust",
        "QQQ": "Invesco QQQ Trust",
        "VFINX": "Vanguard 500 Index Fund"
    }
    
    # Filter based on query (case-insensitive)
    query = query.lower()
    results = [
        {"ticker": ticker, "name": name}
        for ticker, name in common_assets.items()
        if query in ticker.lower() or query in name.lower()
    ]
    
    return {"results": results}

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
