import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Flex, Text, Spinner, useColorModeValue, Alert, AlertIcon, Button } from '@chakra-ui/react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { useInvestment } from '../../context/InvestmentContext';
import { useError } from '../../context/ErrorContext';
import ErrorWrapper from '../ErrorWrapper';
import withErrorHandling from '../withErrorHandling';

const PriceChart = ({ ticker }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  
  const { fetchAssetData, loading: contextLoading } = useInvestment();
  const { registerError, clearError } = useError();
  
  // Generate mock data for development or when API fails
  const generateMockData = (days = 60) => {
    const mockData = [];
    const mockVolume = [];
    const today = new Date();
    let basePrice = 100 + Math.random() * 100; // Random starting price between 100 and 200
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Add some volatility
      const changePercent = (Math.random() * 3 - 1.5) / 100; // -1.5% to +1.5%
      basePrice = basePrice * (1 + changePercent);
      
      const open = basePrice;
      const high = open * (1 + Math.random() * 0.02); // Up to 2% higher
      const low = open * (1 - Math.random() * 0.02); // Up to 2% lower
      const close = (high + low) / 2; // Random close between high and low
      
      // Create structured price point
      mockData.push({
        time: Math.floor(date.getTime() / 1000),
        open: open,
        high: high,
        low: low,
        close: close
      });
      
      // Create volume data point
      const volume = Math.floor(100000 + Math.random() * 900000); // Random volume between 100k and 1M
      mockVolume.push({
        time: Math.floor(date.getTime() / 1000),
        value: volume,
        color: changePercent >= 0 ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)'
      });
    }
    
    return { priceData: mockData, volumeData: mockVolume };
  };
  
  // Format timestamps consistently
  const formatTimeData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => {
      // If time is already a timestamp (number), use it directly
      if (typeof item.time === 'number') {
        return item;
      }
      
      // If time is a string, convert to timestamp
      if (typeof item.time === 'string') {
        const timestamp = new Date(item.time).getTime() / 1000;
        return { ...item, time: Math.floor(timestamp) };
      }
      
      // Default fallback
      return item;
    });
  };
  
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Clear previous chart if it exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }
    
    try {
      // Chart options
      const chartOptions = {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          backgroundColor: 'transparent',
          textColor: useColorModeValue('#333', '#DDD'),
        },
        grid: {
          vertLines: {
            color: useColorModeValue('rgba(220, 220, 220, 0.8)', 'rgba(70, 70, 70, 0.8)'),
          },
          horzLines: {
            color: useColorModeValue('rgba(220, 220, 220, 0.8)', 'rgba(70, 70, 70, 0.8)'),
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        timeScale: {
          borderColor: useColorModeValue('#D3D3D3', '#555'),
        },
        rightPriceScale: {
          borderColor: useColorModeValue('#D3D3D3', '#555'),
        },
      };
      
      // Create chart instance
      chartRef.current = createChart(chartContainerRef.current, chartOptions);
      
      // Add an area series for the asset price
      areaSeriesRef.current = chartRef.current.addAreaSeries({
        topColor: 'rgba(38, 198, 218, 0.56)',
        bottomColor: 'rgba(38, 198, 218, 0.04)',
        lineColor: 'rgba(38, 198, 218, 1)',
        lineWidth: 2,
      });
      
      // Add a histogram series for volume
      volumeSeriesRef.current = chartRef.current.addHistogramSeries({
        color: 'rgba(38, 198, 218, 0.5)',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      
      // Handle window resize
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          areaSeriesRef.current = null;
          volumeSeriesRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing chart:', err);
      setError('Failed to initialize chart');
    }
  }, []);
  
  // Load data for chart
  useEffect(() => {
    if (!ticker) return;
    
    const loadData = async () => {
      setError(null);
      clearError('price-chart');
      setIsLoading(true);
      
      try {
        const response = await fetchAssetData(ticker);
        
        if (response && response.priceData) {
          // Format data properly for timestamps
          const formattedPriceData = formatTimeData(response.priceData);
          const formattedVolumeData = formatTimeData(response.volumeData || []);
          
          setChartData(formattedPriceData);
          setVolumeData(formattedVolumeData);
        } else {
          // If API response is invalid, use mock data
          console.warn('Using mock data for chart');
          const { priceData, volumeData } = generateMockData();
          setChartData(priceData);
          setVolumeData(volumeData);
        }
      } catch (err) {
        console.error('Error loading chart data:', err);
        setError(err.message || 'Failed to load chart data');
        registerError('price-chart', { message: 'Failed to load chart data' });
        
        // Fall back to mock data
        const { priceData, volumeData } = generateMockData();
        setChartData(priceData);
        setVolumeData(volumeData);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      // Cleanup by clearing error on unmount
      clearError('price-chart');
    };
  }, [ticker, fetchAssetData, clearError, registerError]);
  
  // Update chart data when it changes
  useEffect(() => {
    if (!chartRef.current || !areaSeriesRef.current || chartData.length === 0) return;
    
    try {
      // Update chart data
      areaSeriesRef.current.setData(chartData);
      
      // Update volume data if available
      if (volumeSeriesRef.current && volumeData.length > 0) {
        volumeSeriesRef.current.setData(volumeData);
      }
      
      // Fit content to visible range
      chartRef.current.timeScale().fitContent();
    } catch (err) {
      console.error('Error updating chart data:', err);
      setError('Failed to update chart. Please try refreshing.');
      registerError('price-chart', { message: 'Chart rendering error' });
    }
  }, [chartData, volumeData, registerError]);
  
  // Get latest price from chart data
  const latestPrice = useMemo(() => {
    if (chartData.length > 0) {
      const latest = chartData[chartData.length - 1];
      return latest.close.toFixed(2);
    }
    return '0.00';
  }, [chartData]);
  
  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length > 1) {
      const latest = chartData[chartData.length - 1];
      const previous = chartData[chartData.length - 2];
      return ((latest.close - previous.close) / previous.close * 100).toFixed(2);
    }
    return '0.00';
  }, [chartData]);
  
  // Determine if price is up or down
  const isPriceUp = useMemo(() => {
    return parseFloat(priceChange) >= 0;
  }, [priceChange]);
  
  const handleRetry = () => {
    if (!ticker) return;
    
    // Clear error and reload data
    setError(null);
    clearError('price-chart');
    setIsLoading(true);
    
    // Attempt to fetch data again
    fetchAssetData(ticker)
      .then(response => {
        if (response && response.priceData) {
          const formattedPriceData = formatTimeData(response.priceData);
          const formattedVolumeData = formatTimeData(response.volumeData || []);
          
          setChartData(formattedPriceData);
          setVolumeData(formattedVolumeData);
        } else {
          throw new Error('Invalid data received');
        }
      })
      .catch(err => {
        console.error('Error retrying chart data load:', err);
        setError('Failed to load chart data on retry');
        registerError('price-chart', { message: 'Failed to load chart data on retry' });
        
        // Fall back to mock data again
        const { priceData, volumeData } = generateMockData();
        setChartData(priceData);
        setVolumeData(volumeData);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  if (isLoading || contextLoading) {
    return (
      <Flex 
        justify="center" 
        align="center" 
        h="300px" 
        bg={useColorModeValue('white', 'gray.800')}
        borderRadius="md"
        borderWidth="1px"
        p={4}
      >
        <Spinner size="xl" color="primary.500" />
      </Flex>
    );
  }
  
  if (error) {
    return (
      <ErrorWrapper 
        error={{ message: error }} 
        onRetry={handleRetry} 
        componentName="Price Chart" 
        showRetry={true} 
      />
    );
  }
  
  return (
    <Box 
      bg={useColorModeValue('white', 'gray.800')}
      borderRadius="md"
      borderWidth="1px"
      p={4}
      h="100%"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontWeight="bold" fontSize="lg">
          {ticker ? `${ticker} Price History` : 'Price Chart'}
        </Text>
      </Flex>
      
      <Box ref={chartContainerRef} w="100%" h="300px" />
      
      {/* Price indicators */}
      <Flex justify="space-between" mb={2}>
        <Text fontSize="xl" fontWeight="bold" color={isPriceUp ? "green.500" : "red.500"}>
          ${latestPrice}
        </Text>
        <Text color={isPriceUp ? "green.500" : "red.500"}>
          {isPriceUp ? "+" : ""}{priceChange}%
        </Text>
      </Flex>
    </Box>
  );
};

export default withErrorHandling(PriceChart, {
  componentName: 'Price Chart',
  onError: (error) => console.error('PriceChart error:', error)
});
