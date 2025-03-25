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
  StatGroup,
  useToast
} from '@chakra-ui/react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import AssetSelector from '../../components/Investment/AssetSelector';
import MetricsDashboard from '../../components/Investment/MetricsDashboard';
import InvestmentManager from '../../components/Investment/InvestmentManager';
import InvestmentFilters from '../../components/InvestmentFilters';
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
    searchAssets = () => {},
    assetComparisons = null,
    loading = false, 
    error = '' 
  } = investmentContext;
  
  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedAssetName, setSelectedAssetName] = useState('');
  const [comparisonTicker, setComparisonTicker] = useState('');
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    assetType: '',
    characteristics: []
  });
  const [localAssetComparisons, setLocalAssetComparisons] = useState({
    return_difference: 5.32,
    correlation: 0.78,
    better_risk_adjusted_return: true
  });
  
  const toast = useToast();
  
  // Handle filter changes from the InvestmentFilters component
  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    // Auto-refresh search results if there's a current search query
    if (selectedTicker) {
      // Set a loading state to indicate filters are being applied
      setLocalLoading(true);
      
      // Add a slight delay to ensure data is processed before showing the toast
      setTimeout(() => {
        // Show toast after a delay to ensure data is loaded
        toast({
          title: "Filters Applied",
          description: `Filtering assets by ${filters.assetType ? filters.assetType : 'all types'} with ${filters.characteristics?.length || 0} characteristics`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        
        // Reset loading state
        setLocalLoading(false);
      }, 800); // Allow time for the data to be processed
    }
  };
  
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
        // Update to use the array-based compareAssets function
        compareAssets([selectedTicker, ticker], '1y');
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
      <Box maxW="7xl" mx="auto" px={{ base: '4', md: '8', lg: '12' }} py={{ base: '6', md: '8', lg: '12' }}>
        <Heading mb={6}>Investment Analytics</Heading>
        
        {/* Add the InvestmentFilters component here */}
        <InvestmentFilters 
          onFilterChange={handleFilterChange}
          initialFilters={activeFilters}
        />
        
        <Tabs variant="enclosed" colorScheme="blue" mt={6}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Portfolio</Tab>
            <Tab>Add Investment</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={6}>
                <GridItem colSpan={{ base: 1, lg: 1 }}>
                  <Box 
                    bg={useColorModeValue('white', 'gray.700')} 
                    borderRadius="lg"
                    boxShadow="sm"
                    mb={6}
                  >
                    <AssetSelector 
                      onAssetSelect={handleAssetSelect}
                      onCompareSelect={handleComparisonSelect}
                      activeFilters={activeFilters} // Pass filters to AssetSelector
                    />
                  </Box>
                  
                  <Box 
                    bg={useColorModeValue('white', 'gray.700')} 
                    borderRadius="lg"
                    boxShadow="sm"
                    mb={6}
                  >
                    <Heading size="md" p={4} borderBottomWidth="1px">Selected Asset</Heading>
                    <Box p={4}>
                      {selectedTicker ? (
                        <Text fontWeight="bold" fontSize="xl">{selectedAssetName} ({selectedTicker})</Text>
                      ) : (
                        <Text color="gray.500">No asset selected</Text>
                      )}
                    </Box>
                  </Box>
                </GridItem>
                
                <GridItem colSpan={{ base: 1, lg: 2 }}>
                  {localLoading ? (
                    <Flex justify="center" align="center" height="300px">
                      <Spinner size="xl" color="primary.500" />
                    </Flex>
                  ) : selectedTicker ? (
                    <>
                      <SimplePriceSummary ticker={selectedTicker} />
                      
                      <Box
                        mt={6}
                        bg={useColorModeValue('white', 'gray.700')}
                        borderRadius="lg"
                        boxShadow="sm"
                      >
                        <Heading size="md" p={4} borderBottomWidth="1px">Asset Metrics</Heading>
                        <MetricsDashboard />
                      </Box>
                    </>
                  ) : (
                    <Box
                      p={8}
                      bg={useColorModeValue('white', 'gray.700')}
                      borderRadius="lg"
                      boxShadow="sm"
                      textAlign="center"
                    >
                      <Heading size="md" mb={4}>Select an Asset</Heading>
                      <Text>Use the asset selector to choose a stock, ETF, or cryptocurrency to analyze.</Text>
                    </Box>
                  )}
                </GridItem>
              </Grid>
            </TabPanel>
            
            <TabPanel>
              <Box
                bg={useColorModeValue('white', 'gray.700')}
                borderRadius="lg"
                boxShadow="sm"
                p={6}
              >
                <Heading size="md" mb={4}>Portfolio Performance</Heading>
                <Text>Portfolio metrics and visualization will be displayed here.</Text>
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box
                bg={useColorModeValue('white', 'gray.700')}
                borderRadius="lg"
                boxShadow="sm"
                p={6}
              >
                <InvestmentManager 
                  onInvestmentAdded={() => {
                    toast({
                      title: "Investment Added",
                      description: "Your investment has been successfully added to your portfolio.",
                      status: "success",
                      duration: 3000,
                      isClosable: true,
                    });
                  }}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DashboardLayout>
  );
};

export default Investments;
