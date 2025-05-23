import React, { useEffect, useRef, useState } from 'react';
import { Box, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
import { createChart, LineStyle } from 'lightweight-charts'; // Added LineStyle
import { useInvestment } from '../../context/InvestmentContext';

// Modify PriceChart to accept a 'data' prop for pre-fetched historical data
const PriceChart = ({ ticker, data: preFetchedData, chartType = 'candlestick' }) => { // Added data and chartType props
  // Use state to store and manage chart data locally
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Safe extraction from context
  const investmentContext = useInvestment() || {};
  const { fetchAssetData = () => Promise.resolve([]) } = investmentContext; // This will be less used if preFetchedData is available
  
  // Refs for DOM and chart objects
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  // Series refs - will hold different types of series based on chartType
  const mainSeriesRef = useRef(null); 
  const volumeSeriesRef = useRef(null); // Keep for candlestick, optional for line
  
  // Color settings
  const chartBgColor = useColorModeValue('white', '#1A202C');
  const textColor = useColorModeValue('#1A202C', 'white');
  const gridColor = useColorModeValue('rgba(0, 0, 0, 0.06)', 'rgba(255, 255, 255, 0.06)');
  const upColor = useColorModeValue('#22c55e', '#22c55e');
  const downColor = useColorModeValue('#ef4444', '#ef4444');

  // Handle time format for chart (CRITICAL FIX)
  const formatTimeForChart = (time) => {
    if (!time) return null;
    
    // If it's already a timestamp number, use it
    if (typeof time === 'number') {
      return time;
    }
    
    // If it's a date string in ISO format (with T)
    if (typeof time === 'string' && time.includes('T')) {
      return Math.floor(new Date(time).getTime() / 1000);
    }
    
    // If it's a simple YYYY-MM-DD format
    if (typeof time === 'string' && time.includes('-')) {
      const [year, month, day] = time.split('-').map(num => parseInt(num, 10));
      // Months in JS are 0-indexed
      return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
    }
    
    // Fallback - try to parse as general date
    return Math.floor(new Date(time).getTime() / 1000);
  };

  // Generate mock data for testing
  const generateMockData = (ticker) => {
    const mockData = [];
    const today = new Date();
    const tickerHash = ticker ? ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 100;
    let price = 100 + (tickerHash % 900); // Base price from ticker
    
    for (let i = 0; i < 100; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (100 - i));
      
      // Use ticker to seed the randomness for consistent data per ticker
      const seed = (tickerHash + i) / 100;
      const change = (Math.sin(seed) * 2) - 0.5;
      price += change;
      
      const open = price - (Math.sin(seed * 7) * 2);
      const close = price;
      const high = Math.max(open, close) + (Math.abs(Math.sin(seed * 3)) * 2);
      const low = Math.min(open, close) - (Math.abs(Math.sin(seed * 5)) * 2);
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        open: open,
        high: high,
        low: low,
        close: close,
        volume: Math.floor(Math.abs(Math.sin(seed * 11)) * 1000000) + 100000
      });
    }
    
    return mockData;
  };

  // Load data for the ticker OR use pre-fetched data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      if (preFetchedData && preFetchedData.length > 0) {
        // If preFetchedData is available, use it directly
        // For line chart, it's already {time, value}. For candlestick, it needs to be OHLCV.
        // This component will now primarily expect the correct format based on chartType.
        setChartData(preFetchedData);
        setIsLoading(false);
        return;
      } else if (chartType === 'candlestick' && ticker) { // Only fetch if candlestick and ticker provided
        try {
          const currentTicker = ticker || 'AAPL'; // Default for candlestick if no ticker
          const mockData = generateMockData(currentTicker); // Fallback
          
          if (typeof fetchAssetData === 'function') {
            const data = await fetchAssetData(currentTicker); // This fetches OHLCV
            if (data && Array.isArray(data) && data.length > 0) {
              setChartData(data);
            } else {
              console.log('Using mock OHLCV data for', currentTicker);
              setChartData(mockData);
            }
          } else {
            console.log('fetchAssetData not available for OHLCV, using mock data');
            setChartData(mockData);
          }
        } catch (err) {
          console.error('Error loading candlestick chart data:', err);
          setError('Failed to load chart data');
          setChartData(generateMockData(ticker || 'AAPL')); // Fallback
        }
      } else if (chartType === 'line' && !preFetchedData) {
        // If it's a line chart but no preFetchedData, it implies an issue or data needs to be fetched differently.
        // For this refactor, we assume line charts WILL get preFetchedData.
        // If not, show an error or a message.
        setError(`No data provided for line chart for ${ticker || 'asset'}.`);
        setChartData([]); // Ensure chartData is empty
      } else {
        // No ticker for candlestick or other unsupported scenario for now
        setError('Chart cannot be displayed. Invalid configuration or missing data.');
        setChartData([]);
      }
      setIsLoading(false);
    }
    
    loadData();
  }, [ticker, fetchAssetData, preFetchedData, chartType]); // Added preFetchedData and chartType to dependencies

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Clean up any existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      mainSeriesRef.current = null; // Generic series ref
      if (volumeSeriesRef.current) { // Volume series might not always exist
        volumeSeriesRef.current = null;
      }
    }

    try {
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { color: chartBgColor },
          textColor: textColor,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        timeScale: {
          borderColor: gridColor,
          timeVisible: true,
          secondsVisible: false,
        },
      });
      
      // Store chart instance in ref
      chartInstanceRef.current = chart;
      
      // Create series based on chartType
      if (chartType === 'candlestick') {
        mainSeriesRef.current = chart.addCandlestickSeries({
          upColor: upColor,
          downColor: downColor,
          borderVisible: false,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
        
        volumeSeriesRef.current = chart.addHistogramSeries({
          color: '#26a69a', // Default volume color
          priceFormat: { type: 'volume' },
          priceScaleId: '', // Attach to main price scale if needed, or dedicated if separate Y-axis for volume
          scaleMargins: { top: 0.8, bottom: 0 }, // Adjust as needed
        });

      } else if (chartType === 'line') {
        mainSeriesRef.current = chart.addLineSeries({
          color: upColor, // Use upColor for line, or make it a prop
          lineWidth: 2,
        });
        // Volume series is optional for line charts, can be added if data includes volume
        // For now, assuming line chart data is simple {time, value}
        if (volumeSeriesRef.current) { // If a volume series was somehow created, ensure it's null
            volumeSeriesRef.current = null; 
        }
      }
      
      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartInstanceRef.current) {
          chartInstanceRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
          chartInstanceRef.current.timeScale().fitContent();
        }
      };
      
      // Create ResizeObserver
      const resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || !chartInstanceRef.current) return;
        const { width } = entries[0].contentRect;
        chartInstanceRef.current.applyOptions({ width });
        chartInstanceRef.current.timeScale().fitContent();
      });
      
      resizeObserver.observe(chartContainerRef.current);
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove();
          chartInstanceRef.current = null;
          candleSeriesRef.current = null;
          volumeSeriesRef.current = null;
        }
      };
    } catch (err) {
      console.error('Chart initialization error:', err);
      setError('Failed to initialize chart');
    }
  }, [chartBgColor, textColor, gridColor, upColor, downColor]);

  // Update chart with data
  useEffect(() => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      // If chartData is empty (e.g. after an error or no data for line chart),
      // ensure we clear any existing series data to show a blank chart.
      if (mainSeriesRef.current) mainSeriesRef.current.setData([]);
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
      return;
    }
    
    if (!chartInstanceRef.current || !mainSeriesRef.current) {
      return;
    }
    
    try {
      if (chartType === 'candlestick') {
        const ohlcData = chartData.map(item => ({
          time: formatTimeForChart(item.date), // Assuming item.date for candlestick
          open: parseFloat(item.open) || 0,
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          close: parseFloat(item.close) || 0
        })).filter(item => item.time !== null);
        mainSeriesRef.current.setData(ohlcData);

        if (volumeSeriesRef.current) { // Check if volume series exists
            const volumeData = chartData.map(item => ({
            time: formatTimeForChart(item.date),
            value: parseFloat(item.volume) || 0,
            color: parseFloat(item.close) >= parseFloat(item.open) 
                ? 'rgba(38, 166, 154, 0.5)' 
                : 'rgba(239, 83, 80, 0.5)'
            })).filter(item => item.time !== null);
            volumeSeriesRef.current.setData(volumeData);
        }

      } else if (chartType === 'line') {
        // Data for line chart is expected to be {time, value}
        // The 'time' field in preFetchedData from historical-price.js is already a UNIX timestamp (seconds)
        const lineData = chartData.map(item => ({ 
          time: item.time, // Assuming item.time is already a UNIX timestamp in seconds
          value: parseFloat(item.value) || 0 
        })).filter(item => item.time != null);
        mainSeriesRef.current.setData(lineData);
        // No volume data for line chart by default in this refactor
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]); // Clear if it exists
      }
      
      chartInstanceRef.current.timeScale().fitContent();
    } catch (err) {
      console.error('Error updating chart data:', err);
      setError('Failed to update chart with data');
    }
  }, [chartData, chartType]); // Added chartType to dependencies

  // Render loading state
  if (isLoading) {
    return (
      <Box height="400px" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="primary.500" />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box height="400px" display="flex" alignItems="center" justifyContent="center">
        <Text color="red.500" fontWeight="medium">
          {error}
        </Text>
      </Box>
    );
  }
  
  // Render chart
  return (
    <Box>
      <Box 
        ref={chartContainerRef} 
        height="400px" 
        width="100%" 
        borderRadius="md"
        overflow="hidden"
      />
      <Text mt={2} fontSize="sm" color="gray.500" textAlign="center">
        Price chart for {ticker || 'selected asset'}
      </Text>
    </Box>
  );
};

export default PriceChart;
