import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  VStack,
  Divider,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  useColorModeValue,
  Skeleton,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiDownload, FiPrinter, FiBarChart2, FiCalendar } from 'react-icons/fi';
import { useBusiness } from '../../../context/BusinessContext';

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const ProfitLossReport = ({ businessId }) => {
  const { 
    generateFinancialReport, 
    businessTransactions, 
    loadBusinessData,
    TRANSACTION_CATEGORIES
  } = useBusiness();
  
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    period: 'thisMonth', // thisMonth, lastMonth, thisYear, lastYear, custom
    currency: 'USD',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const secondaryBgColor = useColorModeValue('gray.50', 'gray.800');
  
  // Load reports when component mounts or filters change
  useEffect(() => {
    if (businessId) {
      generateReport();
    }
  }, [businessId, reportFilters.period]);
  
  // Helper function to update date range based on period
  const updateDateRange = (period) => {
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today;
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = today;
        break;
      case 'lastYear':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        // Keep existing dates for custom range
        return;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today;
    }
    
    setReportFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  };
  
  // Handle period change
  const handlePeriodChange = (e) => {
    const period = e.target.value;
    setReportFilters(prev => ({
      ...prev,
      period
    }));
    
    updateDateRange(period);
  };
  
  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setReportFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If changing dates, switch to custom period
    if (reportFilters.period !== 'custom') {
      setReportFilters(prev => ({
        ...prev,
        period: 'custom'
      }));
    }
  };
  
  // Generate report
  const generateReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Ensure transactions are loaded
      if (!businessTransactions || businessTransactions.length === 0) {
        await loadBusinessData(businessId);
      }
      
      // Generate the report
      const report = await generateFinancialReport(
        businessId,
        reportFilters.startDate,
        reportFilters.endDate
      );
      
      if (!report) {
        setError('Unable to generate report. Please try again.');
      } else {
        setReportData(report);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('An unexpected error occurred while generating the report.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to get period name
  const getPeriodName = () => {
    switch (reportFilters.period) {
      case 'thisMonth':
        return 'This Month';
      case 'lastMonth':
        return 'Last Month';
      case 'thisYear':
        return 'This Year';
      case 'lastYear':
        return 'Last Year';
      case 'custom':
        return `${reportFilters.startDate} to ${reportFilters.endDate}`;
      default:
        return 'Custom Period';
    }
  };
  
  // Print report
  const printReport = () => {
    window.print();
  };
  
  // Export as CSV (placeholder)
  const exportAsCsv = () => {
    alert('Export as CSV functionality will be implemented soon');
  };
  
  return (
    <Box 
      borderWidth="1px" 
      borderRadius="lg"
      borderColor={borderColor}
      overflow="hidden"
    >
      {/* Report Filters */}
      <Box 
        p={4} 
        bg={secondaryBgColor}
        borderBottomWidth="1px"
        borderColor={borderColor}
      >
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Heading as="h3" size="md" mb={2}>
              Profit & Loss Report
            </Heading>
            <Text color="gray.500">
              {getPeriodName()}
            </Text>
          </Box>
          
          <HStack spacing={4} wrap="wrap">
            <Select 
              value={reportFilters.period}
              onChange={handlePeriodChange}
              width="auto"
              minW="150px"
            >
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range</option>
            </Select>
            
            {reportFilters.period === 'custom' && (
              <HStack>
                <Input
                  type="date"
                  name="startDate"
                  value={reportFilters.startDate}
                  onChange={handleDateChange}
                  size="md"
                  width="auto"
                />
                <Text>to</Text>
                <Input
                  type="date"
                  name="endDate"
                  value={reportFilters.endDate}
                  onChange={handleDateChange}
                  size="md"
                  width="auto"
                />
              </HStack>
            )}
            
            <Button 
              leftIcon={<FiBarChart2 />} 
              colorScheme="blue"
              onClick={generateReport}
              isLoading={isLoading}
            >
              Generate
            </Button>
            
            <Button 
              leftIcon={<FiPrinter />} 
              variant="outline"
              onClick={printReport}
            >
              Print
            </Button>
            
            <Button 
              leftIcon={<FiDownload />} 
              variant="outline"
              onClick={exportAsCsv}
            >
              Export
            </Button>
          </HStack>
        </Flex>
      </Box>
      
      {/* Error Display */}
      {error && (
        <Alert status="error" m={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Report Content */}
      <Box p={6}>
        {isLoading ? (
          <VStack spacing={6} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <Skeleton height="100px" borderRadius="md" />
              <Skeleton height="100px" borderRadius="md" />
              <Skeleton height="100px" borderRadius="md" />
            </SimpleGrid>
            <Skeleton height="300px" borderRadius="md" />
          </VStack>
        ) : reportData ? (
          <VStack spacing={8} align="stretch">
            {/* Summary Stats */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <Stat
                p={4}
                bg={bgColor}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                boxShadow="sm"
              >
                <StatLabel fontSize="md">Total Revenue</StatLabel>
                <StatNumber fontSize="2xl" color="green.500">
                  {formatCurrency(reportData.totalRevenue)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={reportData.revenueGrowth >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(reportData.revenueGrowth).toFixed(1)}% from previous period
                </StatHelpText>
              </Stat>
              
              <Stat
                p={4}
                bg={bgColor}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                boxShadow="sm"
              >
                <StatLabel fontSize="md">Total Expenses</StatLabel>
                <StatNumber fontSize="2xl" color="red.500">
                  {formatCurrency(reportData.totalExpenses)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={reportData.expenseGrowth <= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(reportData.expenseGrowth).toFixed(1)}% from previous period
                </StatHelpText>
              </Stat>
              
              <Stat
                p={4}
                bg={bgColor}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                boxShadow="sm"
              >
                <StatLabel fontSize="md">Net Profit</StatLabel>
                <StatNumber 
                  fontSize="2xl"
                  color={reportData.netProfit >= 0 ? 'green.500' : 'red.500'}
                >
                  {formatCurrency(reportData.netProfit)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={reportData.profitGrowth >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(reportData.profitGrowth).toFixed(1)}% from previous period
                </StatHelpText>
              </Stat>
            </SimpleGrid>
            
            {/* Detailed Report */}
            <Box 
              borderWidth="1px" 
              borderRadius="lg"
              borderColor={borderColor}
              overflow="hidden"
            >
              <Table variant="simple">
                <Thead bg={secondaryBgColor}>
                  <Tr>
                    <Th colSpan={3} fontSize="md">Income Statement</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {/* Revenue Section */}
                  <Tr>
                    <Td colSpan={3} fontWeight="bold" bg={secondaryBgColor}>
                      Revenue
                    </Td>
                  </Tr>
                  
                  {reportData.incomeByCategory.map((item, index) => (
                    <Tr key={`income-${index}`}>
                      <Td pl={8}>{item.category}</Td>
                      <Td isNumeric>{formatCurrency(item.amount)}</Td>
                      <Td isNumeric width="100px">
                        {(item.amount / reportData.totalRevenue * 100).toFixed(1)}%
                      </Td>
                    </Tr>
                  ))}
                  
                  <Tr fontWeight="bold">
                    <Td>Total Revenue</Td>
                    <Td isNumeric>{formatCurrency(reportData.totalRevenue)}</Td>
                    <Td isNumeric>100%</Td>
                  </Tr>
                  
                  {/* Expenses Section */}
                  <Tr>
                    <Td colSpan={3} fontWeight="bold" bg={secondaryBgColor}>
                      Expenses
                    </Td>
                  </Tr>
                  
                  {reportData.expensesByCategory.map((item, index) => (
                    <Tr key={`expense-${index}`}>
                      <Td pl={8}>{item.category}</Td>
                      <Td isNumeric>{formatCurrency(item.amount)}</Td>
                      <Td isNumeric>
                        {(item.amount / reportData.totalExpenses * 100).toFixed(1)}%
                      </Td>
                    </Tr>
                  ))}
                  
                  <Tr fontWeight="bold">
                    <Td>Total Expenses</Td>
                    <Td isNumeric>{formatCurrency(reportData.totalExpenses)}</Td>
                    <Td isNumeric>100%</Td>
                  </Tr>
                  
                  {/* Net Profit */}
                  <Tr fontWeight="bold" fontSize="lg">
                    <Td>Net Profit</Td>
                    <Td 
                      isNumeric 
                      color={reportData.netProfit >= 0 ? 'green.500' : 'red.500'}
                    >
                      {formatCurrency(reportData.netProfit)}
                    </Td>
                    <Td isNumeric>
                      {reportData.totalRevenue > 0 
                        ? (reportData.netProfit / reportData.totalRevenue * 100).toFixed(1)
                        : '0.0'}%
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
            
            {/* Cash Flow Summary */}
            <Box>
              <Heading as="h4" size="md" mb={4}>
                Cash Flow Summary
              </Heading>
              
              <VStack 
                spacing={4} 
                align="stretch" 
                p={4}
                borderWidth="1px" 
                borderRadius="lg"
                borderColor={borderColor}
              >
                <Flex justify="space-between">
                  <Text>Beginning Balance</Text>
                  <Text fontWeight="medium">{formatCurrency(reportData.beginningBalance)}</Text>
                </Flex>
                
                <Flex justify="space-between">
                  <Text>Total Inflows</Text>
                  <Text fontWeight="medium" color="green.500">
                    +{formatCurrency(reportData.totalInflows)}
                  </Text>
                </Flex>
                
                <Flex justify="space-between">
                  <Text>Total Outflows</Text>
                  <Text fontWeight="medium" color="red.500">
                    -{formatCurrency(reportData.totalOutflows)}
                  </Text>
                </Flex>
                
                <Divider />
                
                <Flex justify="space-between">
                  <Text fontWeight="bold">Ending Balance</Text>
                  <Text fontWeight="bold">
                    {formatCurrency(reportData.endingBalance)}
                  </Text>
                </Flex>
                
                <Flex justify="space-between">
                  <Text>Net Change</Text>
                  <Text 
                    fontWeight="medium"
                    color={reportData.netChange >= 0 ? 'green.500' : 'red.500'}
                  >
                    {reportData.netChange >= 0 ? '+' : ''}
                    {formatCurrency(reportData.netChange)}
                  </Text>
                </Flex>
              </VStack>
            </Box>
          </VStack>
        ) : (
          <Box textAlign="center" py={10}>
            <Text>No report data available. Please generate a report.</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProfitLossReport;
