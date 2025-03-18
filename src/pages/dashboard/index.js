import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Alert,
  AlertIcon,
  useDisclosure
} from '@chakra-ui/react';
import { FiArrowUpRight, FiArrowDownRight, FiDollarSign, FiBarChart2, FiPieChart, FiTarget, FiDownload } from 'react-icons/fi';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import AIInsightsPanel from '../../components/AIInsightsPanel';
import PriceChart from '../../components/Investment/PriceChart';
import AssetSelector from '../../components/Investment/AssetSelector';
import BudgetManager from '../../components/Finance/BudgetManager';
import ExpenseTracker from '../../components/Finance/ExpenseTracker';
import { useInvestment } from '../../context/InvestmentContext';
import { useFinance } from '../../context/FinanceContext';

// Summary Card component
const SummaryCard = ({ title, value, change, isIncrease, icon, helperText }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Box 
      p={5}
      borderRadius="lg"
      borderWidth="1px" 
      borderColor={borderColor}
      bg={cardBg}
      boxShadow="sm"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
      <Flex justify="space-between" mb={2}>
        <Stat>
          <StatLabel fontSize="sm" color="gray.500">{title}</StatLabel>
          <StatNumber fontSize="2xl">{value}</StatNumber>
          {change && (
            <StatHelpText>
              <StatArrow type={isIncrease ? 'increase' : 'decrease'} />
              {change}
              {helperText && <Text as="span" ml={1} fontSize="xs" color="gray.500">{helperText}</Text>}
            </StatHelpText>
          )}
        </Stat>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="full"
          bg={isIncrease ? 'green.100' : change ? 'red.100' : 'gray.100'}
          color={isIncrease ? 'green.500' : change ? 'red.500' : 'gray.500'}
          boxSize="40px"
        >
          <Icon as={icon} boxSize={5} />
        </Box>
      </Flex>
    </Box>
  );
};

const Dashboard = () => {
  const { assetData, performanceMetrics, loading: investmentLoading } = useInvestment();
  const { 
    dashboardSummary, 
    budgets, 
    expenses, 
    savingsGoals, 
    debts, 
    loading: financeLoading 
  } = useFinance();
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  useEffect(() => {
    // Any initialization can go here
  }, []);
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };
  
  // Format percentage
  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };
  
  // Generate financial report
  const generateReport = async () => {
    try {
      setReportGenerating(true);
      setReportError(null);
      
      // In a real app, this would make an API call
      // For now, we'll simulate an API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReportGenerated(true);
      onOpen(); // Open the modal with the report
    } catch (error) {
      console.error('Error generating report:', error);
      setReportError('Failed to generate report. Please try again later.');
    } finally {
      setReportGenerating(false);
    }
  };
  
  // Get summary data or use placeholders
  const portfolioValue = performanceMetrics?.portfolio_value || 20500;
  const portfolioReturn = performanceMetrics?.total_return_percentage || 8.3;
  const monthlyIncome = dashboardSummary?.monthly_income || 5000;
  const monthlyExpenses = dashboardSummary?.monthly_expenses || 3500;
  const monthlySavings = dashboardSummary?.monthly_savings || 1500;
  const totalDebt = dashboardSummary?.total_debt || 15000;
  const netWorth = portfolioValue + monthlySavings - totalDebt;
  
  // Background colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <DashboardLayout>
      <Box>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Box>
            <Heading size="lg" mb={1}>Financial Dashboard</Heading>
            <Text color="gray.500">Your financial overview</Text>
          </Box>
          <Button 
            colorScheme="primary" 
            size="sm"
            leftIcon={<FiDownload />}
            onClick={generateReport}
            isLoading={reportGenerating}
            loadingText="Generating"
          >
            Generate Report
          </Button>
        </Flex>
        
        {reportError && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {reportError}
          </Alert>
        )}
        
        {/* Financial Summary Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
          <SummaryCard 
            title="Net Worth" 
            value={formatCurrency(netWorth)}
            change="4.5%"
            isIncrease={true}
            icon={FiDollarSign}
            helperText="vs. last month"
          />
          
          <SummaryCard 
            title="Portfolio Value" 
            value={formatCurrency(portfolioValue)}
            change={formatPercentage(portfolioReturn)}
            isIncrease={portfolioReturn > 0}
            icon={FiBarChart2}
            helperText="all time"
          />
          
          <SummaryCard 
            title="Monthly Savings" 
            value={formatCurrency(monthlySavings)}
            change="3.2%"
            isIncrease={true}
            icon={FiTarget}
            helperText="vs. last month"
          />
          
          <SummaryCard 
            title="Total Debt" 
            value={formatCurrency(totalDebt)}
            change="1.8%"
            isIncrease={false}
            icon={FiArrowDownRight}
            helperText="vs. last month"
          />
        </SimpleGrid>
        
        {/* Main Dashboard Content */}
        <Grid 
          templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
          gap={6}
        >
          {/* Main Content - Left and Middle Columns */}
          <GridItem colSpan={{ base: 1, lg: 2 }}>
            <Tabs colorScheme="primary" variant="enclosed" isLazy mb={6}>
              <TabList>
                <Tab>Investment Overview</Tab>
                <Tab>Budget & Expenses</Tab>
              </TabList>
              
              <TabPanels>
                {/* Investment Tab */}
                <TabPanel p={0} pt={4}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                    <Box
                      p={4}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderColor={borderColor}
                      bg={cardBg}
                    >
                      <Heading size="sm" mb={3}>Portfolio Allocation</Heading>
                      <Flex direction="column" align="center" justify="center" height="200px">
                        <Icon as={FiPieChart} boxSize={20} color="gray.300" />
                        <Text mt={4} color="gray.500" textAlign="center">
                          Your portfolio allocation will be displayed here
                        </Text>
                      </Flex>
                    </Box>
                    
                    <Box
                      p={4}
                      borderWidth="1px"
                      borderRadius="lg" 
                      borderColor={borderColor}
                      bg={cardBg}
                    >
                      <Heading size="sm" mb={3}>Performance Metrics</Heading>
                      <SimpleGrid columns={2} spacing={4}>
                        <Stat>
                          <StatLabel>Total Return</StatLabel>
                          <StatNumber fontSize="lg" color={portfolioReturn >= 0 ? "green.500" : "red.500"}>
                            {formatPercentage(portfolioReturn)}
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Volatility</StatLabel>
                          <StatNumber fontSize="lg">
                            {formatPercentage(performanceMetrics?.volatility || 12.5)}
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Sharpe Ratio</StatLabel>
                          <StatNumber fontSize="lg">
                            {(performanceMetrics?.sharpe_ratio || 0.95).toFixed(2)}
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Drawdown</StatLabel>
                          <StatNumber fontSize="lg" color="red.500">
                            {formatPercentage(performanceMetrics?.max_drawdown || -15.4)}
                          </StatNumber>
                        </Stat>
                      </SimpleGrid>
                    </Box>
                  </SimpleGrid>
                  
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    borderColor={borderColor}
                    bg={cardBg}
                    mb={4}
                  >
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="sm">Asset Performance</Heading>
                      <Box width="150px">
                        <AssetSelector 
                          onAssetSelect={(ticker) => setSelectedTicker(ticker)} 
                          initialValue={selectedTicker}
                        />
                      </Box>
                    </Flex>
                    <Box height="250px">
                      <PriceChart ticker={selectedTicker} />
                    </Box>
                  </Box>
                </TabPanel>
                
                {/* Budget & Expenses Tab */}
                <TabPanel p={0} pt={4}>
                  <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4} mb={4}>
                    <Box
                      p={4}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderColor={borderColor}
                      bg={cardBg}
                      height="100%"
                    >
                      <Heading size="sm" mb={3}>Budget Overview</Heading>
                      <Box maxHeight="300px" overflowY="auto">
                        <BudgetManager compact={true} />
                      </Box>
                    </Box>
                    
                    <Box
                      p={4}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderColor={borderColor}
                      bg={cardBg}
                      height="100%"
                    >
                      <Heading size="sm" mb={3}>Recent Expenses</Heading>
                      <Box maxHeight="300px" overflowY="auto">
                        <ExpenseTracker compact={true} limit={5} />
                      </Box>
                    </Box>
                  </SimpleGrid>
                  
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    borderColor={borderColor}
                    bg={cardBg}
                    mb={4}
                  >
                    <Heading size="sm" mb={3}>Income vs. Expenses</Heading>
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
                      <Stat>
                        <StatLabel>Monthly Income</StatLabel>
                        <StatNumber fontSize="lg">{formatCurrency(monthlyIncome)}</StatNumber>
                        <StatHelpText>
                          <StatArrow type="increase" />
                          2.3%
                        </StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Monthly Expenses</StatLabel>
                        <StatNumber fontSize="lg">{formatCurrency(monthlyExpenses)}</StatNumber>
                        <StatHelpText>
                          <StatArrow type="decrease" />
                          1.5%
                        </StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Savings Rate</StatLabel>
                        <StatNumber fontSize="lg">
                          {formatPercentage((monthlySavings / monthlyIncome) * 100)}
                        </StatNumber>
                        <StatHelpText>
                          <StatArrow type="increase" />
                          3.2%
                        </StatHelpText>
                      </Stat>
                    </SimpleGrid>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>
          
          {/* Right Column - AI Insights */}
          <GridItem colSpan={1}>
            <AIInsightsPanel />
          </GridItem>
        </Grid>
        
        {/* Report Generation Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Financial Report</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Alert status="success" mb={4}>
                <AlertIcon />
                Your financial report has been generated successfully!
              </Alert>
              
              <Box mb={4}>
                <Heading size="sm" mb={2}>Summary</Heading>
                <Text>
                  This report provides an overview of your current financial status, 
                  including assets, liabilities, investments, and budget performance.
                </Text>
              </Box>
              
              <SimpleGrid columns={2} spacing={4} mb={4}>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold">Net Worth</Text>
                  <Text>{formatCurrency(netWorth)}</Text>
                </Box>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold">Monthly Savings</Text>
                  <Text>{formatCurrency(monthlyIncome - monthlyExpenses)}</Text>
                </Box>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold">Portfolio Value</Text>
                  <Text>{formatCurrency(portfolioValue)}</Text>
                </Box>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold">Savings Rate</Text>
                  <Text>{formatPercentage((monthlySavings / monthlyIncome) * 100)}</Text>
                </Box>
              </SimpleGrid>
              
              <Text fontSize="sm" color="gray.500">
                Note: In a real application, this would be a comprehensive report that
                you could download as a PDF or export to various formats.
              </Text>
            </ModalBody>
            
            <ModalFooter>
              <Button colorScheme="primary" mr={3} leftIcon={<FiDownload />}>
                Download PDF
              </Button>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
};

export default Dashboard;
