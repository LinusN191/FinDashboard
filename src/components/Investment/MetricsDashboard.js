import React from 'react';
import {
  SimpleGrid,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { useInvestment } from '../../context/InvestmentContext';

const MetricCard = ({ label, value, helpText, isPositive, isCurrency = false, isPercentage = false }) => {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Format the value appropriately
  let formattedValue = value;
  if (isCurrency) {
    formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  } else if (isPercentage) {
    formattedValue = `${value}%`;
  }
  
  return (
    <Box 
      p={5} 
      shadow="md" 
      borderWidth="1px" 
      borderRadius="lg" 
      bg={bgColor}
      borderColor={borderColor}
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.500">{label}</StatLabel>
        <StatNumber fontSize="2xl">{formattedValue}</StatNumber>
        {helpText && (
          <StatHelpText>
            {isPositive !== undefined && (
              <StatArrow type={isPositive ? 'increase' : 'decrease'} />
            )}
            {helpText}
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
};

const MetricsDashboard = ({ ticker }) => {
  const { assetMetrics } = useInvestment();
  
  // Default metrics values
  const defaultMetrics = {
    total_return: 8.5,
    volatility: 12.3,
    sharpe_ratio: 0.98,
    sortino_ratio: 1.2,
    var_95: -2.1
  };
  
  // If no metrics are available, use default values
  const metrics = assetMetrics || defaultMetrics;
  
  return (
    <Box mt={6}>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
        <MetricCard 
          label="Total Return" 
          value={metrics.total_return || 0} 
          helpText="Since inception" 
          isPositive={metrics.total_return > 0}
          isPercentage={true}
        />
        <MetricCard 
          label="Volatility" 
          value={metrics.volatility || 0} 
          helpText="Annualized"
          isPercentage={true}
        />
        <MetricCard 
          label="Sharpe Ratio" 
          value={metrics.sharpe_ratio || 0} 
          helpText="Risk-adjusted return"
          isPositive={metrics.sharpe_ratio > 1}
        />
        <MetricCard 
          label="Sortino Ratio" 
          value={metrics.sortino_ratio || 0} 
          helpText="Downside risk-adjusted"
          isPositive={metrics.sortino_ratio > 1}
        />
        <MetricCard 
          label="Value at Risk (95%)" 
          value={metrics.var_95 || 0} 
          helpText="Daily VaR"
          isPercentage={true}
        />
      </SimpleGrid>
      
      <Divider my={6} />
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Box>
          <MetricCard 
            label="Risk Level" 
            value={getAssetRiskLevel(metrics)}
            helpText={getRiskDescription(getAssetRiskLevel(metrics))}
          />
        </Box>
        <Box>
          <MetricCard 
            label="Performance Rating" 
            value={getPerformanceRating(metrics)}
            helpText={getPerformanceDescription(getPerformanceRating(metrics))}
          />
        </Box>
      </SimpleGrid>
    </Box>
  );
};

// Helper function to determine risk level
const getAssetRiskLevel = (metrics) => {
  if (!metrics) return 'Unknown';
  
  const volatility = metrics.volatility || 0;
  
  if (volatility < 10) return 'Low';
  if (volatility < 20) return 'Medium';
  if (volatility < 30) return 'High';
  return 'Very High';
};

// Helper function for risk descriptions
const getRiskDescription = (riskLevel) => {
  switch (riskLevel) {
    case 'Low':
      return 'Lower volatility than market average';
    case 'Medium':
      return 'Moderate volatility, similar to market';
    case 'High':
      return 'Higher volatility than market average';
    case 'Very High':
      return 'Substantial volatility, significantly above market';
    default:
      return 'Insufficient data to determine risk';
  }
};

// Helper function to determine performance rating
const getPerformanceRating = (metrics) => {
  if (!metrics) return 'Unknown';
  
  const total_return = metrics.total_return || 0;
  const sharpe_ratio = metrics.sharpe_ratio || 0;
  
  if (total_return > 20 && sharpe_ratio > 1.5) return 'Excellent';
  if (total_return > 10 && sharpe_ratio > 1) return 'Good';
  if (total_return > 0 && sharpe_ratio > 0) return 'Average';
  if (total_return < 0 && sharpe_ratio < 0) return 'Poor';
  return 'Mixed';
};

// Helper function for performance descriptions
const getPerformanceDescription = (performance) => {
  switch (performance) {
    case 'Excellent':
      return 'Strong returns with good risk management';
    case 'Good':
      return 'Solid performance at reasonable risk levels';
    case 'Average':
      return 'In line with market expectations';
    case 'Poor':
      return 'Underperforming relative to risk taken';
    case 'Mixed':
      return 'Inconsistent risk-reward profile';
    default:
      return 'Insufficient data to determine performance';
  }
};

export default MetricsDashboard;
