import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Text,
  Heading,
  Divider,
  Skeleton,
  Alert,
  AlertIcon,
  useColorModeValue
} from '@chakra-ui/react';
import { useInvestment } from '../../context/InvestmentContext';

// Metric card component for displaying individual metrics
const MetricCard = ({ title, value, subtitle, change, isLoading, error }) => {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Determine if change is positive or negative
  const isPositive = change >= 0;
  
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={bgColor}
      boxShadow="sm"
      height="100%"
    >
      {error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <Stat>
          <StatLabel color="gray.500" fontSize="sm">{title}</StatLabel>
          <Skeleton isLoaded={!isLoading} mt={1} height={isLoading ? "30px" : "auto"}>
            <StatNumber fontSize="2xl">
              {typeof value === 'number' ? (
                title.toLowerCase().includes('percent') || title.toLowerCase().includes('ratio') ? 
                `${value.toFixed(2)}%` : 
                `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : value || 'N/A'}
            </StatNumber>
          </Skeleton>
          
          {subtitle && (
            <Skeleton isLoaded={!isLoading} mt={1}>
              <StatHelpText fontSize="xs">{subtitle}</StatHelpText>
            </Skeleton>
          )}
          
          {change !== undefined && (
            <Skeleton isLoaded={!isLoading} mt={1}>
              <StatHelpText>
                <StatArrow type={isPositive ? 'increase' : 'decrease'} />
                {Math.abs(change).toFixed(2)}%
              </StatHelpText>
            </Skeleton>
          )}
        </Stat>
      )}
    </Box>
  );
};

const MetricsDashboard = () => {
  const { assetMetrics, performanceMetrics, loading, error } = useInvestment();
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState('');
  const [metrics, setMetrics] = useState(null);
  
  // Safe access to metrics data
  useEffect(() => {
    try {
      // Add a small delay to ensure consistent rendering and prevent flickering
      const timer = setTimeout(() => {
        if (performanceMetrics) {
          setMetrics(performanceMetrics);
          setLocalLoading(false);
        } else if (!loading && !performanceMetrics) {
          setLocalError('Unable to load metrics data');
          setLocalLoading(false);
        }
      }, 300); // Short delay to stabilize rendering
      
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error processing metrics data:', err);
      setLocalError('Error processing metrics data');
      setLocalLoading(false);
    }
  }, [performanceMetrics, loading]);
  
  // Reset loading state when component unmounts
  useEffect(() => {
    return () => {
      setLocalLoading(true);
      setLocalError('');
    };
  }, []);
  
  // Memoize metric cards to prevent unnecessary re-renders
  const metricCards = useMemo(() => {
    if (localLoading || !metrics) {
      // Return skeleton cards if loading or no data
      return Array(6).fill(0).map((_, index) => (
        <MetricCard
          key={`skeleton-${index}`}
          title={`Metric ${index + 1}`}
          isLoading={true}
        />
      ));
    }
    
    if (localError) {
      return (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          {localError}
        </Alert>
      );
    }
    
    // Real metric cards
    return [
      <MetricCard
        key="portfolio-value"
        title="Portfolio Value"
        value={metrics.portfolio_value || 0}
        subtitle="Current valuation"
        isLoading={localLoading}
      />,
      <MetricCard
        key="total-return"
        title="Total Return"
        value={metrics.total_return_percentage || 0}
        change={metrics.total_return_percentage || 0}
        isLoading={localLoading}
      />,
      <MetricCard
        key="ytd-return"
        title="YTD Return"
        value={metrics.ytd_return_percentage || 0}
        change={metrics.ytd_return_percentage || 0}
        isLoading={localLoading}
      />,
      <MetricCard
        key="volatility"
        title="Volatility"
        value={metrics.volatility || 0}
        subtitle="30-day"
        isLoading={localLoading}
      />,
      <MetricCard
        key="sharpe"
        title="Sharpe Ratio"
        value={metrics.sharpe_ratio || 0}
        subtitle="Risk-adjusted return"
        isLoading={localLoading}
      />,
      <MetricCard
        key="max-drawdown"
        title="Max Drawdown"
        value={metrics.max_drawdown || 0}
        subtitle="Largest decline"
        isLoading={localLoading}
      />
    ];
  }, [metrics, localLoading, localError]);
  
  return (
    <Box>
      <Heading size="md" mb={4}>Asset Performance</Heading>
      
      {localError && !localLoading ? (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          {localError}
        </Alert>
      ) : (
        <Grid 
          templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} 
          gap={4}
        >
          {metricCards.map((card, index) => (
            <GridItem key={`metric-grid-item-${index}`}>
              {card}
            </GridItem>
          ))}
        </Grid>
      )}
      
      {/* Add additional portfolio insights section */}
      {metrics && !localLoading && !localError && (
        <>
          <Divider my={6} />
          <Box mt={6}>
            <Heading size="md" mb={4}>Portfolio Insights</Heading>
            <Flex 
              direction={{ base: 'column', md: 'row' }} 
              justifyContent="space-between"
              p={4} 
              borderWidth="1px" 
              borderRadius="lg" 
              borderColor={useColorModeValue('gray.200', 'gray.600')}
              bg={useColorModeValue('gray.50', 'gray.700')}
            >
              <Box mb={{ base: 4, md: 0 }}>
                <Text fontWeight="medium" color="gray.500">Risk Profile</Text>
                <Text fontSize="lg" fontWeight="bold">
                  {metrics.volatility < 10 ? 'Conservative' : 
                   metrics.volatility < 20 ? 'Moderate' : 
                   metrics.volatility < 30 ? 'Growth' : 'Aggressive'}
                </Text>
              </Box>
              
              <Box mb={{ base: 4, md: 0 }}>
                <Text fontWeight="medium" color="gray.500">Alpha</Text>
                <Text 
                  fontSize="lg" 
                  fontWeight="bold"
                  color={metrics.alpha >= 0 ? 'green.500' : 'red.500'}
                >
                  {metrics.alpha >= 0 ? '+' : ''}{metrics.alpha ? metrics.alpha.toFixed(2) : '0.00'}
                </Text>
              </Box>
              
              <Box>
                <Text fontWeight="medium" color="gray.500">Beta</Text>
                <Text fontSize="lg" fontWeight="bold">
                  {metrics.beta ? metrics.beta.toFixed(2) : '1.00'}
                </Text>
              </Box>
            </Flex>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MetricsDashboard;
