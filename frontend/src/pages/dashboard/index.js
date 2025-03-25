import React, { useState, useEffect, useRef } from 'react';
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
  useDisclosure,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Link
} from '@chakra-ui/react';
import { FiArrowUpRight, FiArrowDownRight, FiDollarSign, FiBarChart2, FiPieChart, FiTarget, FiDownload, FiArrowRight, FiTrendingUp, FiCreditCard, FiStar } from 'react-icons/fi';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import AIInsightsPanel from '../../components/AIInsightsPanel';
import { useInvestment } from '../../context/InvestmentContext';
import { useFinance } from '../../context/FinanceContext';
import ErrorBoundary from '../../components/ErrorBoundary';

// Summary Card component
const SummaryCard = ({ title, value, change, isIncrease, icon, helperText, onClick }) => {
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
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
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

// Donut Chart Component
const DonutChart = ({ data, size = 140, thickness = 15, title, colorScheme }) => {
  const colors = {
    primary: ['#4299E1', '#3182CE', '#2B6CB0', '#2C5282'],
    green: ['#48BB78', '#38A169', '#2F855A', '#276749'],
    purple: ['#9F7AEA', '#805AD5', '#6B46C1', '#553C9A'],
    orange: ['#ED8936', '#DD6B20', '#C05621', '#9C4221']
  };
  
  const chartColors = colors[colorScheme] || colors.primary;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate the stroke dash offset for each segment
  let cumulativePercentage = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const circumference = 2 * Math.PI * (size / 2 - thickness / 2);
    const strokeDasharray = `${(percentage * circumference) / 100} ${circumference}`;
    const rotation = cumulativePercentage * 3.6; // 3.6 degrees per percentage point
    cumulativePercentage += percentage;
    
    return {
      ...item,
      percentage,
      strokeDasharray,
      rotation,
      color: chartColors[index % chartColors.length]
    };
  });
  
  return (
    <Box textAlign="center" position="relative" width={`${size}px`} height={`${size}px`} margin="0 auto">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size/2}, ${size/2})`}>
          {segments.map((segment, index) => (
            <circle
              key={`segment-${index}`}
              cx="0"
              cy="0"
              r={size / 2 - thickness / 2}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={segment.strokeDasharray}
              transform={`rotate(${-90 + segment.rotation})`}
            />
          ))}
          <circle
            cx="0"
            cy="0"
            r={size / 2 - thickness - 10}
            fill="none"
          />
        </g>
      </svg>
      {title && (
        <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
          <Text fontWeight="bold" fontSize="sm">{title}</Text>
          <Text fontSize="xs" color="gray.500">{total.toLocaleString()}</Text>
        </Box>
      )}
    </Box>
  );
};

// Speedometer Component
const Speedometer = ({ value, max, title, colorScheme = "primary", size = 140 }) => {
  const percentage = (value / max) * 100;
  const color = percentage > 75 ? "green.500" : percentage > 50 ? "blue.500" : percentage > 25 ? "orange.500" : "red.500";
  
  return (
    <Box textAlign="center">
      <CircularProgress
        value={percentage}
        size={`${size}px`}
        thickness="10px"
        color={color}
        trackColor={useColorModeValue("gray.100", "gray.700")}
      >
        <CircularProgressLabel>
          <Text fontSize="lg" fontWeight="bold">{Math.round(percentage)}%</Text>
        </CircularProgressLabel>
      </CircularProgress>
      <Text mt={2} fontWeight="bold" fontSize="sm">{title}</Text>
      <Text fontSize="xs" color="gray.500">{value.toLocaleString()} / {max.toLocaleString()}</Text>
    </Box>
  );
};

// Small InfoCard component
const InfoCard = ({ title, value, icon, colorScheme = "blue" }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Box
      p={4}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      bg={cardBg}
    >
      <Flex alignItems="center" mb={2}>
        <Box
          borderRadius="full"
          bg={`${colorScheme}.100`}
          color={`${colorScheme}.500`}
          p={2}
          mr={3}
        >
          <Icon as={icon} boxSize={4} />
        </Box>
        <Text fontWeight="medium" color="gray.500" fontSize="sm">{title}</Text>
      </Flex>
      <Text fontSize="xl" fontWeight="bold">{value}</Text>
    </Box>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const { assetData, performanceMetrics, loading: investmentLoading } = useInvestment();
  const { 
    dashboardSummary, 
    budgets, 
    expenses, 
    savingsGoals, 
    debts, 
    loading: financeLoading 
  } = useFinance();
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
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
  
  // Navigate to investment page
  const goToInvestments = () => {
    router.push('/dashboard/investments');
  };
  
  // Navigate to finance page
  const goToFinance = () => {
    router.push('/dashboard/finance');
  };
  
  // Get summary data or use placeholders
  const portfolioValue = performanceMetrics?.portfolio_value || 20500;
  const portfolioReturn = performanceMetrics?.total_return_percentage || 8.3;
  const monthlyIncome = dashboardSummary?.monthly_income || 5000;
  const monthlyExpenses = dashboardSummary?.monthly_expenses || 3500;
  const monthlySavings = dashboardSummary?.monthly_savings || 1500;
  const totalDebt = dashboardSummary?.total_debt || 15000;
  const netWorth = portfolioValue + monthlySavings - totalDebt;
  
  // Prepare data for charts
  const assetAllocationData = [
    { name: 'Stocks', value: portfolioValue * 0.6 },
    { name: 'Bonds', value: portfolioValue * 0.2 },
    { name: 'Cash', value: portfolioValue * 0.1 },
    { name: 'Other', value: portfolioValue * 0.1 }
  ];
  
  const expenseBreakdownData = [
    { name: 'Housing', value: monthlyExpenses * 0.35 },
    { name: 'Food', value: monthlyExpenses * 0.15 },
    { name: 'Transport', value: monthlyExpenses * 0.15 },
    { name: 'Others', value: monthlyExpenses * 0.35 }
  ];
  
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
          <Flex gap={3}>
            <Button 
              as={Link} 
              href="/" 
              colorScheme="gray" 
              variant="outline"
              leftIcon={<FiArrowRight transform="rotate(180deg)" />}
            >
              Home
            </Button>
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
            onClick={goToInvestments}
          />
          
          <SummaryCard 
            title="Monthly Savings" 
            value={formatCurrency(monthlySavings)}
            change="3.2%"
            isIncrease={true}
            icon={FiTarget}
            helperText="vs. last month"
            onClick={goToFinance}
          />
          
          <SummaryCard 
            title="Total Debt" 
            value={formatCurrency(totalDebt)}
            change="1.8%"
            isIncrease={false}
            icon={FiArrowDownRight}
            helperText="vs. last month"
            onClick={goToFinance}
          />
        </SimpleGrid>
        
        {/* Main Dashboard Content with Visual Charts */}
        <Grid 
          templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
          gap={6}
        >
          {/* Main Content - Left and Middle Columns */}
          <GridItem colSpan={{ base: 1, lg: 2 }}>
            <Box mb={6}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
                {/* Asset Allocation Chart */}
                <Box 
                  p={4} 
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={cardBg}
                  height="100%"
                >
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="sm">Asset Allocation</Heading>
                    <Link color="primary.500" fontSize="sm" onClick={goToInvestments} cursor="pointer">
                      View Investments <Icon as={FiArrowRight} ml={1} boxSize={3} />
                    </Link>
                  </Flex>
                  <DonutChart 
                    data={assetAllocationData} 
                    title="Portfolio" 
                    colorScheme="primary"
                  />
                  <SimpleGrid columns={2} spacing={4} mt={4}>
                    {assetAllocationData.map((item, index) => (
                      <Flex key={index} align="center">
                        <Box 
                          w="10px" 
                          h="10px" 
                          borderRadius="full"
                          bg={index === 0 ? '#4299E1' : index === 1 ? '#3182CE' : index === 2 ? '#2B6CB0' : '#2C5282'}
                          mr={2}
                        />
                        <Text fontSize="xs">{item.name} ({((item.value/portfolioValue)*100).toFixed(1)}%)</Text>
                      </Flex>
                    ))}
                  </SimpleGrid>
                </Box>
                
                {/* Monthly Budget Progress */}
                <Box 
                  p={4} 
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={cardBg}
                  height="100%"
                >
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="sm">Monthly Budget Progress</Heading>
                    <Link color="primary.500" fontSize="sm" onClick={goToFinance} cursor="pointer">
                      View Budgets <Icon as={FiArrowRight} ml={1} boxSize={3} />
                    </Link>
                  </Flex>
                  <Box mt={4} mb={6}>
                    <DonutChart 
                      data={expenseBreakdownData} 
                      title="Expenses" 
                      colorScheme="green"
                    />
                    <SimpleGrid columns={2} spacing={4} mt={4}>
                      {expenseBreakdownData.map((item, index) => (
                        <Flex key={index} align="center">
                          <Box 
                            w="10px" 
                            h="10px" 
                            borderRadius="full"
                            bg={index === 0 ? '#48BB78' : index === 1 ? '#38A169' : index === 2 ? '#2F855A' : '#276749'}
                            mr={2}
                          />
                          <Text fontSize="xs">{item.name} ({((item.value/monthlyExpenses)*100).toFixed(1)}%)</Text>
                        </Flex>
                      ))}
                    </SimpleGrid>
                  </Box>
                </Box>
              </SimpleGrid>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
                <InfoCard 
                  title="Income vs Expenses" 
                  value={formatPercentage((monthlySavings / monthlyIncome) * 100)}
                  icon={FiTrendingUp}
                  colorScheme="green"
                />
                <InfoCard 
                  title="Debt Ratio" 
                  value={formatPercentage((totalDebt / netWorth) * 100)}
                  icon={FiCreditCard}
                  colorScheme="red"
                />
                <InfoCard 
                  title="Investment Return" 
                  value={formatPercentage(portfolioReturn)}
                  icon={FiStar}
                  colorScheme="purple"
                />
              </SimpleGrid>
              
              {/* Financial Goals Progress */}
              <Box 
                p={4} 
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={cardBg}
                mb={6}
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="sm">Financial Goals Progress</Heading>
                  <Link color="primary.500" fontSize="sm" onClick={goToFinance} cursor="pointer">
                    Manage Goals <Icon as={FiArrowRight} ml={1} boxSize={3} />
                  </Link>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} mt={6} mb={2}>
                  <Speedometer 
                    value={netWorth} 
                    max={50000} 
                    title="Emergency Fund" 
                    colorScheme="blue"
                  />
                  <Speedometer 
                    value={monthlySavings * 12} 
                    max={20000} 
                    title="Vacation Fund" 
                    colorScheme="green"
                  />
                  <Speedometer 
                    value={portfolioValue} 
                    max={100000} 
                    title="Retirement" 
                    colorScheme="purple"
                  />
                </SimpleGrid>
              </Box>
            </Box>
          </GridItem>
          
          {/* Right Column - AI Insights */}
          <GridItem colSpan={1}>
            <ErrorBoundary>
              <AIInsightsPanel />
            </ErrorBoundary>
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
