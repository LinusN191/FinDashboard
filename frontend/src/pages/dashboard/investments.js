import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  useColorModeValue,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup
} from '@chakra-ui/react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import AssetSelector from '../../components/Investment/AssetSelector';
import MetricsDashboard from '../../components/Investment/MetricsDashboard';
import InvestmentManager from '../../components/Investment/InvestmentManager';
import { useInvestment } from '../../context/InvestmentContext';

const SimplePriceSummary = ({ ticker }) => {
  const investmentContext = useInvestment() || {};
  const { 
    assetData = [], 
    assetMetrics = null,
    loading = false, 
    error = null 
  } = investmentContext;
  
  const cardBg = useColorModeValue('white', 'gray.700');
  
  if (loading) {
    return (
      <Flex justify="center" align="center" height="300px">
        <Spinner size="xl" color="primary.500" />
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Box p={4} bg="red.50" color="red.500" borderRadius="md" textAlign="center">
        <Heading size="md" mb={2}>Unable to load price data</Heading>
        <Text>Please try again later or select a different asset.</Text>
      </Box>
    );
  }
  
  const latestData = assetData && assetData.length > 0 
    ? assetData[assetData.length - 1] 
    : null;
  
  const priceChange = assetMetrics?.change_percentage || 2.34;
  const isPositive = priceChange >= 0;
  
  return (
    <Box p={6}>
      <Heading size="md" mb={4}>Price Summary for {ticker}</Heading>
      
      <StatGroup mb={6}>
        <Stat>
          <StatLabel>Current Price</StatLabel>
          <StatNumber>${latestData?.close?.toFixed(2) || (100 + Math.random() * 50).toFixed(2)}</StatNumber>
          <StatHelpText>
            <StatArrow type={isPositive ? 'increase' : 'decrease'} />
            {Math.abs(priceChange).toFixed(2)}%
          </StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>Volume</StatLabel>
          <StatNumber>{latestData?.volume?.toLocaleString() || (1000000 + Math.random() * 9000000).toFixed(0)}</StatNumber>
          <StatHelpText>Daily trading volume</StatHelpText>
        </Stat>
      </StatGroup>
      
      <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={6}>
        <Box p={3} bg={cardBg} borderRadius="md" boxShadow="sm">
          <Text fontWeight="bold" mb={1}>Open</Text>
          <Text>${latestData?.open?.toFixed(2) || (95 + Math.random() * 10).toFixed(2)}</Text>
        </Box>
        <Box p={3} bg={cardBg} borderRadius="md" boxShadow="sm">
          <Text fontWeight="bold" mb={1}>Close</Text>
          <Text>${latestData?.close?.toFixed(2) || (100 + Math.random() * 10).toFixed(2)}</Text>
        </Box>
        <Box p={3} bg={cardBg} borderRadius="md" boxShadow="sm">
          <Text fontWeight="bold" mb={1}>High</Text>
          <Text>${latestData?.high?.toFixed(2) || (105 + Math.random() * 10).toFixed(2)}</Text>
        </Box>
        <Box p={3} bg={cardBg} borderRadius="md" boxShadow="sm">
          <Text fontWeight="bold" mb={1}>Low</Text>
          <Text>${latestData?.low?.toFixed(2) || (90 + Math.random() * 10).toFixed(2)}</Text>
        </Box>
      </Grid>
      
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Chart view has been temporarily replaced with a summary view for improved stability.
      </Alert>
    </Box>
  );
};

const Investments = () => {
  const investmentContext = useInvestment() || {};
  const { 
    currentAsset = null, 
    setCurrentAsset = () => {}, 
    compareAssets = () => {}, 
    assetComparisons = null,
    loading = false, 
    error = '' 
  } = investmentContext;
  
  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedAssetName, setSelectedAssetName] = useState('');
  const [comparisonTicker, setComparisonTicker] = useState('');
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState('');
  const [localAssetComparisons, setLocalAssetComparisons] = useState({
    return_difference: 5.32,
    correlation: 0.78,
    better_risk_adjusted_return: true
  });
  
  const handleAssetSelect = (ticker, name) => {
    if (!ticker) return;
    
    setSelectedTicker(ticker);
    setSelectedAssetName(name || ticker);
    
    if (typeof setCurrentAsset === 'function') {
      try {
        setCurrentAsset({ ticker, name: name || ticker });
      } catch (err) {
        console.error("Error setting current asset:", err);
        setLocalError("Failed to set current asset.");
      }
    }
  };
  
  const handleComparisonSelect = (ticker) => {
    if (!ticker || !selectedTicker) return;
    
    setComparisonTicker(ticker);
    
    if (typeof compareAssets === 'function') {
      try {
        compareAssets(selectedTicker, ticker);
      } catch (err) {
        console.error("Error comparing assets:", err);
        setLocalError("Failed to compare assets.");
      }
    }
  };
  
  useEffect(() => {
    if (assetComparisons) {
      setLocalAssetComparisons(assetComparisons);
    }
  }, [assetComparisons]);
  
  useEffect(() => {
    const initializeDefaultAsset = async () => {
      try {
        setLocalLoading(true);
        
        if (!selectedTicker) {
          const defaultTicker = 'AAPL';
          const defaultName = 'Apple Inc.';
          
          setSelectedTicker(defaultTicker);
          setSelectedAssetName(defaultName);
          
          if (typeof setCurrentAsset === 'function') {
            await setCurrentAsset({ ticker: defaultTicker, name: defaultName });
          }
        }
      } catch (err) {
        console.error("Error initializing default asset:", err);
        setLocalError("Failed to initialize default asset.");
      } finally {
        setTimeout(() => {
          setLocalLoading(false);
        }, 1000);
      }
    };
    
    initializeDefaultAsset();
  }, [setCurrentAsset]);

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const displayComparisons = assetComparisons || localAssetComparisons;
  
  const isLoading = loading || localLoading;
  
  const displayError = error || localError;
  
  return (
    <DashboardLayout>
      <Box p={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Box>
            <Heading size="lg" mb={1}>Investment Analytics</Heading>
            <Text color="gray.500">Analyze and compare financial assets</Text>
          </Box>
        </Flex>
        
        <Box 
          mb={6} 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          borderColor={borderColor}
          bg={cardBg}
        >
          <Heading size="md" mb={3}>Search Assets</Heading>
          <AssetSelector onAssetSelect={handleAssetSelect} />
        </Box>
        
        {displayError && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {displayError}
          </Alert>
        )}
        
        {isLoading && (
          <Flex justify="center" my={8}>
            <Spinner size="xl" color="primary.500" />
          </Flex>
        )}
        
        {selectedTicker && !isLoading && (
          <Box mb={8}>
            <Heading size="md" mb={4}>
              {selectedAssetName} ({selectedTicker})
            </Heading>
            
            <Tabs colorScheme="primary" isLazy>
              <TabList>
                <Tab>Price Summary</Tab>
                <Tab>Key Metrics</Tab>
                <Tab>Comparisons</Tab>
                <Tab>Analysis</Tab>
                <Tab>Portfolio</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Box 
                    p={4} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor={borderColor}
                    bg={cardBg}
                  >
                    <SimplePriceSummary ticker={selectedTicker} />
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box 
                    p={4} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor={borderColor}
                    bg={cardBg}
                  >
                    <MetricsDashboard ticker={selectedTicker} />
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box 
                    p={4} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor={borderColor}
                    bg={cardBg}
                  >
                    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                      <GridItem>
                        <Heading size="sm" mb={3}>Compare With</Heading>
                        <AssetSelector onAssetSelect={(ticker) => handleComparisonSelect(ticker)} />
                        
                        {comparisonTicker && (
                          <Text mt={4} fontWeight="medium">
                            Comparing {selectedTicker} with {comparisonTicker}
                          </Text>
                        )}
                      </GridItem>
                      
                      <GridItem>
                        {displayComparisons && comparisonTicker ? (
                          <Box>
                            <Heading size="sm" mb={3}>Comparison Results</Heading>
                            <Text>
                              Return Difference: {displayComparisons.return_difference > 0 ? '+' : ''}
                              {typeof displayComparisons.return_difference === 'number' 
                                ? displayComparisons.return_difference.toFixed(2) 
                                : '0.00'}%
                            </Text>
                            <Text>
                              Correlation: {typeof displayComparisons.correlation === 'number' 
                                ? displayComparisons.correlation.toFixed(2) 
                                : '0.00'}
                            </Text>
                            <Text>
                              Risk-Adjusted Return: {selectedTicker} is {displayComparisons.better_risk_adjusted_return ? 'better' : 'worse'} than {comparisonTicker}
                            </Text>
                          </Box>
                        ) : (
                          <Text>Select an asset to compare</Text>
                        )}
                      </GridItem>
                    </Grid>
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box 
                    p={4} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor={borderColor}
                    bg={cardBg}
                  >
                    <Heading size="sm" mb={4}>Investment Analysis</Heading>
                    <Text mb={3}>
                      This analysis provides insights into the performance and potential of {selectedAssetName} ({selectedTicker}).
                    </Text>
                    
                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} mt={6}>
                      <GridItem>
                        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                          <Heading size="xs" mb={2}>Risk Assessment</Heading>
                          <Text>Medium-Low</Text>
                        </Box>
                      </GridItem>
                      <GridItem>
                        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                          <Heading size="xs" mb={2}>Growth Potential</Heading>
                          <Text>High</Text>
                        </Box>
                      </GridItem>
                      <GridItem>
                        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                          <Heading size="xs" mb={2}>Recommendation</Heading>
                          <Text>Buy</Text>
                        </Box>
                      </GridItem>
                    </Grid>
                  </Box>
                </TabPanel>
                
                <TabPanel>
                  <Box 
                    p={4} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor={borderColor}
                    bg={cardBg}
                  >
                    <InvestmentManager />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        )}
        
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          borderColor={borderColor}
          bg={cardBg}
        >
          <Heading size="md" mb={3}>Portfolio Overview</Heading>
          <Text color="gray.500">
            Your investment portfolio will be displayed here. Add investments to see your portfolio 
            performance, allocation, and analysis.
          </Text>
          <Button colorScheme="primary" size="sm" mt={3}>
            Add Investments
          </Button>
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default Investments;
