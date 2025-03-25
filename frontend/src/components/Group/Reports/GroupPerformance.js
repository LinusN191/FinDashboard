import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  Select,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiDownload, FiFilter, FiPieChart, FiBarChart2, FiTrendingUp } from 'react-icons/fi';
import { useGroup } from '../../../context/GroupContext';

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to format percentage
const formatPercentage = (value) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const GroupPerformance = ({ groupId, contributions = [], investments = [] }) => {
  const [period, setPeriod] = useState('year-to-date');
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1 of current year
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  const { generateGroupReport } = useGroup();
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const chartBgColor = useColorModeValue('blue.50', 'blue.900');
  
  // Define date ranges for different periods
  const getDateRangeForPeriod = (period) => {
    const today = new Date();
    let startDate, endDate;
    
    endDate = new Date().toISOString().split('T')[0]; // Today
    
    switch (period) {
      case 'month-to-date':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // First day of current month
        break;
      case 'quarter-to-date':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]; // First day of current quarter
        break;
      case 'year-to-date':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]; // Jan 1 of current year
        break;
      case 'last-3-months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()).toISOString().split('T')[0];
        break;
      case 'last-6-months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()).toISOString().split('T')[0];
        break;
      case 'last-12-months':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        break;
      case 'all-time':
        // Find earliest date among all contributions and investments
        const allDates = [
          ...contributions.map(c => new Date(c.date)),
          ...investments.map(i => new Date(i.date))
        ];
        
        if (allDates.length > 0) {
          const earliestDate = new Date(Math.min(...allDates));
          startDate = earliestDate.toISOString().split('T')[0];
        } else {
          // Default to 1 year ago if no dates available
          startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        }
        break;
      case 'custom':
        return customDateRange;
      default:
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]; // Default to YTD
    }
    
    return { startDate, endDate };
  };
  
  // Generate report based on selected period
  const generateReport = async () => {
    if (!groupId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRangeForPeriod(period);
      
      const reportResult = await generateGroupReport(groupId, startDate, endDate);
      setReportData(reportResult);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle period change
  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
  };
  
  // Handle custom date change
  const handleCustomDateChange = (e) => {
    const { name, value } = e.target;
    setCustomDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Generate report when period changes
  useEffect(() => {
    generateReport();
  }, [period, customDateRange, groupId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle report download
  const handleDownloadReport = () => {
    // Implementation for downloading report would go here
    console.log('Download report:', reportData);
  };
  
  return (
    <Box>
      {/* Error message */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Report Controls */}
      <Box 
        mb={6} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} wrap="wrap" align="flex-end">
          <FormControl maxW={{ base: "100%", md: "300px" }}>
            <FormLabel>Report Period</FormLabel>
            <Select 
              value={period}
              onChange={handlePeriodChange}
              icon={<FiFilter />}
            >
              <option value="month-to-date">Month to Date</option>
              <option value="quarter-to-date">Quarter to Date</option>
              <option value="year-to-date">Year to Date</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="last-12-months">Last 12 Months</option>
              <option value="all-time">All Time</option>
              <option value="custom">Custom Range</option>
            </Select>
          </FormControl>
          
          {period === 'custom' && (
            <>
              <FormControl maxW={{ base: "100%", md: "200px" }}>
                <FormLabel>Start Date</FormLabel>
                <Input 
                  type="date" 
                  name="startDate"
                  value={customDateRange.startDate}
                  onChange={handleCustomDateChange}
                />
              </FormControl>
              
              <FormControl maxW={{ base: "100%", md: "200px" }}>
                <FormLabel>End Date</FormLabel>
                <Input 
                  type="date" 
                  name="endDate"
                  value={customDateRange.endDate}
                  onChange={handleCustomDateChange}
                />
              </FormControl>
            </>
          )}
          
          <Button 
            leftIcon={<FiDownload />} 
            colorScheme="blue"
            ml={{ base: 0, md: 'auto' }}
            isDisabled={!reportData || isLoading}
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
        </Flex>
      </Box>
      
      {/* Report Content */}
      {isLoading ? (
        <Flex justify="center" align="center" py={8}>
          <Spinner size="xl" />
          <Text ml={4}>Generating report...</Text>
        </Flex>
      ) : reportData ? (
        <Box>
          {/* Summary Stats */}
          <Grid 
            templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(3, 1fr)" }}
            gap={4}
            mb={6}
          >
            <GridItem 
              p={4} 
              borderWidth="1px" 
              borderRadius="lg"
              borderColor={borderColor}
              bg={bgColor}
            >
              <Stat>
                <StatLabel>Total Contributions</StatLabel>
                <StatNumber>{formatCurrency(reportData.totalContributions)}</StatNumber>
                <StatHelpText>
                  <Text fontSize="sm">
                    {formatDate(reportData.periodStart)} - {formatDate(reportData.periodEnd)}
                  </Text>
                </StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem 
              p={4} 
              borderWidth="1px" 
              borderRadius="lg"
              borderColor={borderColor}
              bg={bgColor}
            >
              <Stat>
                <StatLabel>Total Investments</StatLabel>
                <StatNumber>{formatCurrency(reportData.totalInvestmentAmount)}</StatNumber>
                <StatHelpText>
                  <Text fontSize="sm">During selected period</Text>
                </StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem 
              p={4} 
              borderWidth="1px" 
              borderRadius="lg"
              borderColor={borderColor}
              bg={bgColor}
            >
              <Stat>
                <StatLabel>Return on Investment</StatLabel>
                <StatNumber>{formatCurrency(reportData.totalReturns)}</StatNumber>
                <StatHelpText>
                  <StatArrow type={reportData.returnOnInvestment > 0 ? 'increase' : 'decrease'} />
                  {formatPercentage(reportData.returnOnInvestment)} ROI
                </StatHelpText>
              </Stat>
            </GridItem>
          </Grid>
          
          {/* Detailed Reports */}
          <Tabs variant="enclosed" colorScheme="blue" isFitted mb={6}>
            <TabList mb="1em">
              <Tab><FiBarChart2 style={{ marginRight: '8px' }} /> Member Contributions</Tab>
              <Tab><FiPieChart style={{ marginRight: '8px' }} /> Investment Types</Tab>
              <Tab><FiTrendingUp style={{ marginRight: '8px' }} /> Performance Metrics</Tab>
            </TabList>
            
            <TabPanels>
              {/* Member Contributions Tab */}
              <TabPanel>
                <Box 
                  borderWidth="1px" 
                  borderRadius="lg"
                  borderColor={borderColor}
                  overflow="hidden"
                >
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Member</Th>
                        <Th isNumeric>Amount</Th>
                        <Th isNumeric>Percentage</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {reportData.memberContributions.map((item, index) => (
                        <Tr key={index}>
                          <Td>{item.memberName}</Td>
                          <Td isNumeric>{formatCurrency(item.amount)}</Td>
                          <Td isNumeric>
                            {((item.amount / reportData.totalContributions) * 100).toFixed(1)}%
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
                
                {/* Chart placeholder - in a real implementation, we would render a chart here */}
                <Box 
                  mt={6}
                  height="250px"
                  bg={chartBgColor}
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="lg" fontWeight="medium">Member Contribution Chart</Text>
                </Box>
              </TabPanel>
              
              {/* Investment Types Tab */}
              <TabPanel>
                <Box 
                  borderWidth="1px" 
                  borderRadius="lg"
                  borderColor={borderColor}
                  overflow="hidden"
                >
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Investment Type</Th>
                        <Th isNumeric>Amount</Th>
                        <Th isNumeric>Returns</Th>
                        <Th isNumeric>ROI</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {reportData.investmentReturns.map((item, index) => (
                        <Tr key={index}>
                          <Td>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Td>
                          <Td isNumeric>{formatCurrency(item.amount)}</Td>
                          <Td isNumeric>{formatCurrency(item.returns)}</Td>
                          <Td isNumeric>{formatPercentage(item.returnsPercentage)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
                
                {/* Chart placeholder - in a real implementation, we would render a chart here */}
                <Box 
                  mt={6}
                  height="250px"
                  bg={chartBgColor}
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="lg" fontWeight="medium">Investment Distribution Chart</Text>
                </Box>
              </TabPanel>
              
              {/* Performance Metrics Tab */}
              <TabPanel>
                <Grid 
                  templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)" }}
                  gap={4}
                >
                  <GridItem 
                    p={4} 
                    borderWidth="1px" 
                    borderRadius="lg"
                    borderColor={borderColor}
                    bg={bgColor}
                  >
                    <VStack align="stretch" spacing={4}>
                      <Heading size="md">Performance Overview</Heading>
                      
                      <HStack justify="space-between">
                        <Text>Total Contributions:</Text>
                        <Text fontWeight="bold">{formatCurrency(reportData.totalContributions)}</Text>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text>Total Investments:</Text>
                        <Text fontWeight="bold">{formatCurrency(reportData.totalInvestmentAmount)}</Text>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text>Total Returns:</Text>
                        <Text 
                          fontWeight="bold" 
                          color={reportData.totalReturns >= 0 ? "green.500" : "red.500"}
                        >
                          {formatCurrency(reportData.totalReturns)}
                        </Text>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text>Return on Investment:</Text>
                        <Text 
                          fontWeight="bold" 
                          color={reportData.returnOnInvestment >= 0 ? "green.500" : "red.500"}
                        >
                          {formatPercentage(reportData.returnOnInvestment)}
                        </Text>
                      </HStack>
                    </VStack>
                  </GridItem>
                  
                  {/* Chart placeholder - in a real implementation, we would render a chart here */}
                  <GridItem 
                    height="250px"
                    bg={chartBgColor}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="lg" fontWeight="medium">Performance Trend Chart</Text>
                  </GridItem>
                </Grid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      ) : (
        <Box p={6} textAlign="center">
          <Text>No report data available. Please select a different period or try again.</Text>
        </Box>
      )}
    </Box>
  );
};

export default GroupPerformance;
