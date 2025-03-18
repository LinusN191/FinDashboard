import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue
} from '@chakra-ui/react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import BudgetManager from '../../components/Finance/BudgetManager';
import DebtTracker from '../../components/Finance/DebtTracker';
import ExpenseTracker from '../../components/Finance/ExpenseTracker';
import IncomeManager from '../../components/Finance/IncomeManager';
import SavingsGoalTracker from '../../components/Finance/SavingsGoalTracker';
import { useFinance } from '../../context/FinanceContext';

// Summary Card component
const SummaryCard = ({ title, value, change, isIncrease, helperText }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Box 
      p={5} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      bg={cardBg}
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.500">{title}</StatLabel>
        <StatNumber fontSize="2xl">{value}</StatNumber>
        {change && (
          <StatHelpText>
            <StatArrow type={isIncrease ? 'increase' : 'decrease'} />
            {change}
            {helperText && <Text as="span" ml={1} fontSize="xs">{helperText}</Text>}
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
};

const Finance = () => {
  const { dashboardSummary } = useFinance();
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Get summary data or use placeholders
  const monthlyIncome = dashboardSummary?.monthly_income || 0;
  const monthlyExpenses = dashboardSummary?.monthly_expenses || 0;
  const monthlySavings = dashboardSummary?.monthly_savings || 0;
  const totalBudgeted = dashboardSummary?.total_budgeted_amount || 0;
  const totalDebt = dashboardSummary?.total_debt || 0;
  const totalSavings = dashboardSummary?.total_savings || 0;
  
  return (
    <DashboardLayout>
      <Box p={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Box>
            <Heading size="lg" mb={1}>Personal Finance</Heading>
            <Text color="gray.500">Track your budgets, expenses, debts, and savings</Text>
          </Box>
        </Flex>
        
        {/* Financial Summary Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={8}>
          <SummaryCard 
            title="Monthly Income" 
            value={formatCurrency(monthlyIncome)}
            change="1.5%"
            isIncrease={true}
            helperText="vs. last month"
          />
          
          <SummaryCard 
            title="Monthly Expenses" 
            value={formatCurrency(monthlyExpenses)}
            change="2.3%"
            isIncrease={false}
            helperText="vs. last month"
          />
          
          <SummaryCard 
            title="Monthly Savings" 
            value={formatCurrency(monthlySavings)}
            change="5.1%"
            isIncrease={true}
            helperText="vs. last month"
          />
          
          <SummaryCard 
            title="Total Budgeted" 
            value={formatCurrency(totalBudgeted)}
          />
          
          <SummaryCard 
            title="Total Debt" 
            value={formatCurrency(totalDebt)}
            change="1.2%"
            isIncrease={false}
            helperText="vs. last month"
          />
          
          <SummaryCard 
            title="Total Savings" 
            value={formatCurrency(totalSavings)}
            change="3.7%"
            isIncrease={true}
            helperText="vs. last month"
          />
        </SimpleGrid>
        
        {/* Main Finance Components */}
        <Tabs colorScheme="primary" isLazy>
          <TabList>
            <Tab>Income</Tab>
            <Tab>Budget</Tab>
            <Tab>Expenses</Tab>
            <Tab>Debt</Tab>
            <Tab>Savings Goals</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={useColorModeValue('white', 'gray.700')}
              >
                <IncomeManager />
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={useColorModeValue('white', 'gray.700')}
              >
                <BudgetManager />
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={useColorModeValue('white', 'gray.700')}
              >
                <ExpenseTracker />
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={useColorModeValue('white', 'gray.700')}
              >
                <DebtTracker />
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={useColorModeValue('white', 'gray.700')}
              >
                <SavingsGoalTracker />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DashboardLayout>
  );
};

export default Finance;
