import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import axios from 'axios';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Divider,
  Tag,
  useColorModeValue,
  Flex,
  Link as ChakraLink,
  Icon,
  Select, // Added for chart days selection
} from '@chakra-ui/react';
import { FiChevronRight, FiHome, FiBarChart2 } from 'react-icons/fi'; // Added FiBarChart2
import DashboardLayout from '../../../components/Layout/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import PriceChart from '../../../components/Investment/PriceChart'; // Import PriceChart

const DetailedAssetPage = () => {
  const router = useRouter();
  const { assetId } = router.query;
  const { currentUser, getIdToken } = useAuth();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for historical price data and chart
  const [historicalData, setHistoricalData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [chartDays, setChartDays] = useState('30'); // Default to 30 days

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!assetId || !currentUser) {
        if(!currentUser && !loading) { 
             setError("User not authenticated. Please log in.");
             setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setAsset(null);
      setHistoricalData([]); // Clear previous chart data
      setChartError(null);

      try {
        const token = await getIdToken();
        if (!token) throw new Error("Authentication token not available.");

        const response = await axios.get(`/api/investments/asset/${assetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAsset(response.data);
        // After setting asset, trigger historical data fetch
      } catch (err) {
        console.error("Error fetching asset details:", err);
        if (err.response) setError(`Error: ${err.response.status} - ${err.response.data.error || 'Could not fetch asset details.'}`);
        else if (err.request) setError("Network error. Please check your connection.");
        else setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssetDetails();
  }, [assetId, currentUser, getIdToken]); // Removed 'loading' from here, as it was causing re-runs

  // Effect for fetching historical data when asset or chartDays changes
  useEffect(() => {
    const fetchHistoricalAssetData = async () => {
      if (!asset || !currentUser) return;

      let apiIdForChart = '';
      let source = '';

      if (asset.assetType === 'CRYPTO' && asset.apiId) {
        apiIdForChart = asset.apiId;
        source = 'coingecko';
      } else if ((asset.assetType === 'STOCK' || asset.assetType === 'ETF') && asset.tickerSymbol) {
        apiIdForChart = asset.tickerSymbol;
        source = 'finnhub';
      } else {
        // Not an eligible asset type for charting or missing identifier
        setHistoricalData([]); // Ensure chart is cleared if asset is not chartable
        return;
      }

      setChartLoading(true);
      setChartError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Authentication token not available for chart data.");

        const response = await axios.get(`/api/investments/asset/historical-price`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { assetApiId: apiIdForChart, apiSource: source, days: chartDays },
        });
        setHistoricalData(response.data);
      } catch (err) {
        console.error("Error fetching historical chart data:", err);
        const chartSpecificError = err.response?.data?.error || err.message || `Failed to load price history for ${asset.name}.`;
        setChartError(chartSpecificError);
        setHistoricalData([]); // Clear data on error
      } finally {
        setChartLoading(false);
      }
    };

    if (asset) { // Only fetch if asset details are loaded
        fetchHistoricalAssetData();
    }
  }, [asset, chartDays, currentUser, getIdToken]); // Depends on asset and chartDays

  const DetailItem = ({ label, value, isTag = false, tagColor = 'gray' }) => (
    <Box mb={3}>
      <Text fontSize="sm" color="gray.500" fontWeight="medium">{label}</Text>
      {isTag ? (
        <Tag size="md" variant="subtle" colorScheme={tagColor} mt={1}>{value || 'N/A'}</Tag>
      ) : (
        <Text fontSize="md" fontWeight="semibold">{value != null && value !== '' ? value : 'N/A'}</Text>
      )}
    </Box>
  );
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (value) => {
    if (value == null || isNaN(parseFloat(value))) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(value));
  };
  
  const formatNumber = (value, decimals = 2) => {
    if (value == null || isNaN(parseFloat(value))) return 'N/A';
    return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };


  if (loading) {
    return (
      <DashboardLayout>
        <Flex justifyContent="center" alignItems="center" height="calc(100vh - 200px)">
          <Spinner size="xl" />
        </Flex>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert status="error" mt={8} mx="auto" maxWidth="lg">
          <AlertIcon />
          {error}
        </Alert>
         <Box textAlign="center" mt={4}>
            <NextLink href="/dashboard/investments" passHref>
              <ChakraLink color="blue.500">Back to Investments Dashboard</ChakraLink>
            </NextLink>
          </Box>
      </DashboardLayout>
    );
  }

  if (!asset) {
    return (
      <DashboardLayout>
        <Text textAlign="center" mt={8}>No asset data found.</Text>
         <Box textAlign="center" mt={4}>
            <NextLink href="/dashboard/investments" passHref>
              <ChakraLink color="blue.500">Back to Investments Dashboard</ChakraLink>
            </NextLink>
          </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }} maxWidth="1200px" mx="auto">
        <Breadcrumb spacing="8px" separator={<Icon as={FiChevronRight} color="gray.500" />} mb={6}>
          <BreadcrumbItem>
            <NextLink href="/dashboard" passHref>
              <BreadcrumbLink><Icon as={FiHome} mr={1} verticalAlign="middle"/>Dashboard</BreadcrumbLink>
            </NextLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <NextLink href="/dashboard/investments" passHref>
              <BreadcrumbLink>My Investments</BreadcrumbLink>
            </NextLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href="#">{asset.name || 'Asset Details'}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <Heading as="h1" size="xl" mb={2}>
          Asset Details: {asset.name}
        </Heading>
        <Tag size="lg" colorScheme="teal" variant="solid" mb={6}>{asset.assetType}</Tag>
        
        {/* Price Chart Section */}
        { (asset.assetType === 'CRYPTO' || asset.assetType === 'STOCK' || asset.assetType === 'ETF') && (
            <Box mt={8} p={6} bg={cardBg} borderRadius="lg" shadow="base" borderWidth="1px" borderColor={borderColor}>
                <Flex justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading as="h2" size="lg">
                        <Icon as={FiBarChart2} mr={2} verticalAlign="middle" />
                        Price History
                    </Heading>
                    <Select 
                        width="150px" 
                        value={chartDays} 
                        onChange={(e) => setChartDays(e.target.value)}
                        isDisabled={chartLoading}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last 1 Year</option>
                    </Select>
                </Flex>
                {chartLoading && <Flex justifyContent="center" alignItems="center" height="400px"><Spinner size="xl" /></Flex>}
                {chartError && !chartLoading && <Alert status="error"><AlertIcon />{chartError}</Alert>}
                {!chartLoading && !chartError && historicalData.length > 0 && (
                    <PriceChart 
                        data={historicalData} 
                        chartType="line" // Using line chart for simple historical price
                        ticker={asset.tickerSymbol || asset.apiId} // For chart label
                    />
                )}
                 {!chartLoading && !chartError && historicalData.length === 0 && asset && (
                    <Text textAlign="center" py={10}>Price history data is not available for this asset or period.</Text>
                )}
            </Box>
        )}


        <Box mt={8} p={6} bg={cardBg} borderRadius="lg" shadow="base" borderWidth="1px" borderColor={borderColor}>
          <Heading as="h2" size="lg" mb={6} borderBottomWidth="1px" pb={3}>Common Details</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={6}>
            <DetailItem label="Asset Name" value={asset.name} />
            <DetailItem label="Asset Type" value={asset.assetType} isTag tagColor="blue" />
            <DetailItem label="Quantity" value={formatNumber(asset.quantity, asset.assetType === 'CRYPTO' ? 8 : 2)} /> 
            <DetailItem label="Purchase Price (per unit)" value={formatCurrency(asset.purchasePrice)} />
            <DetailItem label="Total Purchase Value" value={formatCurrency(parseFloat(asset.purchasePrice) * parseFloat(asset.quantity))} />
            <DetailItem label="Purchase Date" value={formatDate(asset.purchaseDate)} />
            <DetailItem label="Current Value" value={formatCurrency(asset.currentValue)} />
            <DetailItem label="Last Price Update" value={asset.lastPriceUpdate ? formatDate(asset.lastPriceUpdate) : 'N/A'} />
          </SimpleGrid>
          <DetailItem label="Notes" value={asset.notes || 'N/A'} />
          <Divider my={6} />
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <DetailItem label="Created At" value={formatDate(asset.createdAt)} />
            <DetailItem label="Last Modified At" value={formatDate(asset.updatedAt)} />
          </SimpleGrid>
        </Box>

        {/* Type-Specific Details */}
        <Box mt={8} p={6} bg={cardBg} borderRadius="lg" shadow="base" borderWidth="1px" borderColor={borderColor}>
          <Heading as="h2" size="lg" mb={6} borderBottomWidth="1px" pb={3}>Type-Specific Details</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {asset.assetType === 'CRYPTO' && (
              <>
                <DetailItem label="CoinGecko ID (API ID)" value={asset.apiId} />
                <DetailItem label="Symbol" value={asset.cryptoSymbol || asset.apiId?.toUpperCase()} /> 
              </>
            )}
            {(asset.assetType === 'STOCK' || asset.assetType === 'ETF') && (
              <>
                <DetailItem label="Ticker Symbol" value={asset.tickerSymbol} />
                {asset.assetType === 'ETF' && asset.expenseRatio && <DetailItem label="Expense Ratio" value={`${formatNumber(asset.expenseRatio * 100)}%`} /> }
              </>
            )}
            {asset.assetType === 'BOND' && (
              <>
                <DetailItem label="Issuer" value={asset.issuer} />
                <DetailItem label="Maturity Date" value={formatDate(asset.maturityDate)} />
                <DetailItem label="Coupon Rate" value={`${formatNumber(asset.couponRate)}%`} />
                <DetailItem label="Face Value" value={formatCurrency(asset.faceValue)} />
              </>
            )}
            {asset.assetType === 'REIT' && (
              <>
                <DetailItem label="Ticker Symbol" value={asset.tickerSymbol || 'N/A (Private)'} />
                <DetailItem label="Property Type" value={asset.propertyType} />
                {asset.dividendYield != null && <DetailItem label="Dividend Yield" value={`${formatNumber(asset.dividendYield)}%`} />}
              </>
            )}
            {asset.assetType === 'ALTERNATIVE' && (
              <>
                <DetailItem label="Description" value={asset.description} />
                <DetailItem label="Valuation Method" value={asset.valuationMethod} />
                <DetailItem label="Valuation Date" value={formatDate(asset.valuationDate)} />
              </>
            )}
            {asset.assetType === 'FRACTIONAL' && (
              <>
                <DetailItem label="Underlying Asset Name" value={asset.underlyingAssetName} />
                <DetailItem label="Provider/Platform" value={asset.provider} />
                <DetailItem label="Percentage Owned" value={`${formatNumber(asset.percentageOwned)}%`} />
                <DetailItem label="Original Asset Value (Total)" value={formatCurrency(asset.originalAssetValue)} />
              </>
            )}
          </SimpleGrid>
        </Box>

        <Box textAlign="center" mt={8}>
          <NextLink href="/dashboard/investments" passHref>
            <ChakraLink color="blue.500" fontWeight="medium">
              <Icon as={FiChevronRight} transform="rotate(180deg)" mr={1} />
              Back to Investments Dashboard
            </ChakraLink>
          </NextLink>
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default DetailedAssetPage;
