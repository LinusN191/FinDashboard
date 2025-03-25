import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  HStack,
  Badge,
  Divider,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  VStack,
  Card,
  CardHeader,
  CardBody,
  Progress,
  IconButton,
  Tooltip,
  Spinner,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  RadioGroup,
  Radio,
  Stack,
  useDisclosure,
  useToast,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { 
  FiDownload, 
  FiInfo, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiFilter, 
  FiPlus,
  FiSearch,
  FiX,
  FiCheck,
  FiDollarSign,
  FiPieChart,
  FiBarChart2,
  FiCalendar,
  FiTrash2,
  FiEdit
} from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';
import { useError } from '../../context/ErrorContext';
import ErrorWrapper from '../ErrorWrapper';
import withErrorHandling from '../withErrorHandling';
import { CSVLink } from 'react-csv';

/**
 * BudgetSummary Component
 * Displays a month-by-month profit and loss statement showing income and expenses
 */
const BudgetSummary = () => {
  const { expenses, budgets, dashboardSummary, loading, fetchExpenses, fetchBudgets, createBudget } = useFinance();
  const { registerError } = useError();

  const [summaryData, setSummaryData] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [selectedMonths, setSelectedMonths] = useState([new Date().getMonth()]);
  const [years, setYears] = useState([currentYear]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'category'
  const [activeTab, setActiveTab] = useState('table'); // 'table', 'chart', 'breakdown'
  const [csvData, setCsvData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState({ income: [], expenses: [] });
  
  // Add category modal
  const { isOpen: isCategoryModalOpen, onOpen: onCategoryModalOpen, onClose: onCategoryModalClose } = useDisclosure();
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'income', // Default to income category
    budget: '',
    description: ''
  });
  const [categoryFormErrors, setCategoryFormErrors] = useState({});
  const toast = useToast();
  
  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelDeleteRef = useRef();

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const positiveColor = useColorModeValue('green.500', 'green.300');
  const negativeColor = useColorModeValue('red.500', 'red.300');
  const neutralColor = useColorModeValue('gray.600', 'gray.400');

  // Define months
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Process and organize expenses and income data by month
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch fresh data
        await fetchExpenses();
        await fetchBudgets();
        
        if (!expenses || expenses.length === 0) {
          setSummaryData([]);
          setIsLoading(false);
          return;
        }
        
        // Process all transactions into monthly summaries
        const monthlySummary = processTransactionsByMonth(expenses, currentYear, budgets);
        setSummaryData(monthlySummary);
        
        // Extract available years from the data
        const availableYears = [...new Set(expenses.map(item => 
          new Date(item.date).getFullYear()
        ))].sort().reverse();
        
        setYears(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]);
        
        // Create CSV data
        generateCSVData(monthlySummary);
        
        // Update filtered categories
        const { incomeCategories, expenseCategories } = getCategories(expenses);
        setFilteredCategories({
          income: incomeCategories,
          expenses: expenseCategories
        });
        
      } catch (err) {
        console.error('Error processing budget summary data:', err);
        setError('Failed to load budget summary data');
        registerError('budget-summary', { message: 'Error loading budget summary', details: err });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [expenses, currentYear, fetchExpenses, fetchBudgets, registerError]);

  // Create CSV data from summary
  const generateCSVData = (summary) => {
    if (!summary || summary.length === 0 || displayMonth >= summary.length) {
      setCsvData([]);
      return;
    }
    
    const monthData = summary[displayMonth];
    const csvRows = [];
    
    // Header row
    csvRows.push(['Category', 'Budget', 'Actual', 'Variance', 'Variance %']);
    
    // Income section header
    csvRows.push(['INCOME', '', '', '', '']);
    
    // Income categories
    Object.keys(monthData.income.categories).forEach(category => {
      const budget = monthData.income.budgeted[category] || 0;
      const actual = monthData.income.total || 0;
      const variance = actual - budget;
      const variancePercent = budget ? variance / budget : 0;
      
      csvRows.push([
        category,
        budget.toFixed(2),
        actual.toFixed(2),
        variance.toFixed(2),
        (variancePercent * 100).toFixed(1) + '%'
      ]);
    });
    
    // Income total
    csvRows.push([
      'Total Income',
      monthData.income.budgeted.toFixed(2),
      monthData.income.total.toFixed(2),
      (monthData.income.total - monthData.income.budgeted).toFixed(2),
      (((monthData.income.total - monthData.income.budgeted) / 
        (monthData.income.budgeted || 1)) * 100).toFixed(1) + '%'
    ]);
    
    // Empty row
    csvRows.push(['', '', '', '', '']);
    
    // Expenses section header
    csvRows.push(['EXPENSES', '', '', '', '']);
    
    // Expense categories
    Object.keys(monthData.expenses.categories).forEach(category => {
      const budget = monthData.expenses.budgeted[category] || 0;
      const actual = monthData.expenses.total || 0;
      const variance = budget - actual; // Positive is good for expenses
      const variancePercent = budget ? variance / budget : 0;
      
      csvRows.push([
        category,
        budget.toFixed(2),
        actual.toFixed(2),
        variance.toFixed(2),
        (variancePercent * 100).toFixed(1) + '%'
      ]);
    });
    
    // Expenses total
    csvRows.push([
      'Total Expenses',
      monthData.expenses.budgeted.toFixed(2),
      monthData.expenses.total.toFixed(2),
      (monthData.expenses.budgeted - monthData.expenses.total).toFixed(2),
      (((monthData.expenses.budgeted - monthData.expenses.total) / 
        (monthData.expenses.budgeted || 1)) * 100).toFixed(1) + '%'
    ]);
    
    // Empty row
    csvRows.push(['', '', '', '', '']);
    
    // Net Income row
    const netBudgeted = monthData.income.budgeted - monthData.expenses.budgeted;
    const netActual = monthData.income.total - monthData.expenses.total;
    const netVariance = netActual - netBudgeted;
    const netVariancePercent = netBudgeted ? netVariance / netBudgeted : 0;
    
    csvRows.push([
      'NET INCOME',
      netBudgeted.toFixed(2),
      netActual.toFixed(2),
      netVariance.toFixed(2),
      (netVariancePercent * 100).toFixed(1) + '%'
    ]);
    
    setCsvData(csvRows);
  };

  // Process transactions into monthly summaries
  const processTransactionsByMonth = (transactions, year, budgetData) => {
    // Initialize data structure for each month
    const monthlyData = months.map((month, index) => {
      return {
        month,
        monthIndex: index,
        income: { 
          total: 0, 
          categories: {},
          budgeted: 0,
          variance: 0
        },
        expenses: { 
          total: 0, 
          categories: {},
          budgeted: 0,
          variance: 0
        },
        netIncome: 0
      };
    });

    // Process each transaction
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const transactionYear = date.getFullYear();
      
      // Only include transactions from the selected year
      if (transactionYear === year) {
        const monthIndex = date.getMonth();
        const amount = parseFloat(transaction.amount);
        const category = transaction.category || 'Uncategorized';
        const type = transaction.type || (amount > 0 ? 'income' : 'expense');
        
        // Ensure amount is positive for calculations
        const absAmount = Math.abs(amount);
        
        // Update the appropriate month's data
        if (type.toLowerCase() === 'income') {
          // Add to income total
          monthlyData[monthIndex].income.total += absAmount;
          
          // Update income category
          if (!monthlyData[monthIndex].income.categories[category]) {
            monthlyData[monthIndex].income.categories[category] = 0;
          }
          monthlyData[monthIndex].income.categories[category] += absAmount;
        } else {
          // Add to expenses
          monthlyData[monthIndex].expenses.total += absAmount;
          
          // Update category breakdown
          if (!monthlyData[monthIndex].expenses.categories[category]) {
            monthlyData[monthIndex].expenses.categories[category] = 0;
          }
          monthlyData[monthIndex].expenses.categories[category] += absAmount;
        }
        
        // Calculate net income
        monthlyData[monthIndex].netIncome = 
          monthlyData[monthIndex].income.total - monthlyData[monthIndex].expenses.total;
      }
    });
    
    // Get budget data for the year and map to months
    if (budgetData && budgetData.length > 0) {
      budgetData.forEach(budget => {
        const category = budget.name;
        const budgetType = budget.type || 'expense'; // Default to expense
        const monthlyAmount = budget.amount / 12; // Divide annual budget into monthly
        
        monthlyData.forEach(monthData => {
          if (budgetType.toLowerCase() === 'income') {
            monthData.income.budgeted += monthlyAmount;
            
            // Calculate variance (actual - budgeted)
            const actualAmount = monthData.income.categories[category] || 0;
            const variance = actualAmount - monthlyAmount;
            
            monthData.income.variance += variance;
          } else {
            monthData.expenses.budgeted += monthlyAmount;
            
            // Calculate variance (budgeted - actual) for expenses
            // Positive variance means under budget (good), negative means over budget (bad)
            const actualAmount = monthData.expenses.categories[category] || 0;
            const variance = monthlyAmount - actualAmount;
            
            monthData.expenses.variance += variance;
          }
        });
      });
    }
    
    return monthlyData;
  };

  // Calculate year-to-date totals
  const calculateYTDTotals = () => {
    return summaryData.reduce((totals, month) => {
      return {
        income: totals.income + month.income.total,
        expenses: totals.expenses + month.expenses.total,
        netIncome: totals.netIncome + month.netIncome,
        budgetedIncome: totals.budgetedIncome + month.income.budgeted,
        budgetedExpenses: totals.budgetedExpenses + month.expenses.budgeted,
        incomeVariance: totals.incomeVariance + month.income.variance,
        expensesVariance: totals.expensesVariance + month.expenses.variance
      };
    }, { 
      income: 0, 
      expenses: 0, 
      netIncome: 0, 
      budgetedIncome: 0, 
      budgetedExpenses: 0, 
      incomeVariance: 0, 
      expensesVariance: 0 
    });
  };

  // Extract unique income and expense categories from the data
  const getCategories = (expenses) => {
    const incomeCategories = new Set();
    const expenseCategories = new Set();
    
    if (expenses && expenses.length > 0) {
      expenses.forEach(transaction => {
        if (transaction.type === 'income') {
          incomeCategories.add(transaction.category);
        } else {
          expenseCategories.add(transaction.category);
        }
      });
    }
    
    summaryData.forEach(month => {
      Object.keys(month.income.categories).forEach(category => {
        incomeCategories.add(category);
      });
      
      Object.keys(month.expenses.categories).forEach(category => {
        expenseCategories.add(category);
      });
    });
    
    return {
      incomeCategories: Array.from(incomeCategories).sort(),
      expenseCategories: Array.from(expenseCategories).sort()
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value || 0);
  };

  // Get color based on value
  const getValueColor = (value) => {
    if (value > 0) return positiveColor;
    if (value < 0) return negativeColor;
    return neutralColor;
  };

  // Handle year change
  const handleYearChange = (event) => {
    setCurrentYear(parseInt(event.target.value));
  };
  
  // Handle month change
  const handleMonthChange = (month) => {
    setDisplayMonth(month);
  };
  
  // Handle month selection (for multi-month view)
  const handleMonthSelection = (month) => {
    setSelectedMonths(prev => {
      // If month is already selected, remove it (unless it's the only one selected)
      if (prev.includes(month) && prev.length > 1) {
        return prev.filter(m => m !== month);
      }
      // If month is not selected, add it
      else if (!prev.includes(month)) {
        return [...prev, month].sort((a, b) => a - b);
      }
      return prev;
    });
    
    // Always also set display month to the most recently selected month
    setDisplayMonth(month);
  };
  
  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === 'monthly' ? 'category' : 'monthly');
  };
  
  // Get percentage of budget used
  const getBudgetPercentage = (actual, budgeted) => {
    if (!budgeted) return 0;
    return actual / budgeted;
  };
  
  // Calculate variance percentage
  const calculateVariancePercentage = (actual, budgeted) => {
    if (!budgeted) return 0;
    return (actual - budgeted) / budgeted;
  };

  // Get variance percentage (alias for calculateVariancePercentage for backward compatibility)
  const getVariancePercentage = (actual, budgeted) => {
    return calculateVariancePercentage(actual, budgeted);
  };

  // Handle category form input change
  const handleCategoryFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Clear error for this field
    if (categoryFormErrors[name]) {
      setCategoryFormErrors({
        ...categoryFormErrors,
        [name]: null
      });
    }
    
    setCategoryForm({
      ...categoryForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Validate category form
  const validateCategoryForm = () => {
    const errors = {};
    
    if (!categoryForm.name.trim()) {
      errors.name = 'Category name is required';
    }
    
    if (!categoryForm.budget || parseFloat(categoryForm.budget) <= 0) {
      errors.budget = 'Valid budget amount is required';
    }
    
    setCategoryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle category creation
  const handleCreateCategory = async () => {
    if (!validateCategoryForm()) {
      return;
    }
    
    try {
      const categoryData = {
        name: categoryForm.name,
        type: categoryForm.type,
        budget: parseFloat(categoryForm.budget),
        description: categoryForm.description
      };
      
      await createBudget(categoryData);
      
      toast({
        title: 'Category created',
        description: `${categoryForm.name} has been created successfully.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
      
      // Reset form and close modal
      setCategoryForm({
        name: '',
        type: 'income',
        budget: '',
        description: ''
      });
      
      onCategoryModalClose();
      
      // Refresh data
      fetchBudgets();
      
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to create category. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      // Reset filtered categories
      const { incomeCategories, expenseCategories } = getCategories(expenses);
      setFilteredCategories({
        income: incomeCategories,
        expenses: expenseCategories
      });
      return;
    }
    
    // Filter categories based on search query
    const { incomeCategories, expenseCategories } = getCategories(expenses);
    
    setFilteredCategories({
      income: incomeCategories.filter(category => 
        category.toLowerCase().includes(query)
      ),
      expenses: expenseCategories.filter(category => 
        category.toLowerCase().includes(query)
      )
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <Box p={5} textAlign="center">
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Loading budget summary...</Text>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box p={5}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  // Extract categories
  const { incomeCategories, expenseCategories } = getCategories(expenses);
  // Calculate YTD totals
  const ytdTotals = calculateYTDTotals();

  return (
    <Box>
      {error && (
        <Box p={4} mt={4} mb={4} borderRadius="md" bg="red.100" color="red.700">
        <Text>{error}</Text>
      </Box>
      )}

      {/* Header with controls */}
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Text fontSize="sm" color="gray.500">Select Month(s):</Text>
          <Flex mt={1} wrap="wrap">
            {months.map((month, index) => (
              <Badge
                key={index}
                mr={2}
                mb={1}
                p={2}
                cursor="pointer"
                colorScheme={selectedMonths.includes(index) ? "primary" : "gray"}
                onClick={() => handleMonthSelection(index)}
                borderRadius="full"
              >
                {month}
              </Badge>
            ))}
          </Flex>
        </Box>
        
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm">
            {currentYear}
          </MenuButton>
          <MenuList>
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
              <MenuItem key={year} onClick={() => setCurrentYear(year)}>
                {year}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>
      
      {/* Search and view controls */}
      <Flex mb={4} justify="space-between" align="center" wrap="wrap">
        <InputGroup maxW="300px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="Search categories"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <InputRightElement>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<FiX />}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              />
            </InputRightElement>
          )}
        </InputGroup>
        
        <HStack spacing={4}>
          {/* View mode selector */}
          <Menu>
            <MenuButton as={Button} rightIcon={<FiFilter />} size="sm">
              View Mode
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => setViewMode('monthly')}>Monthly View</MenuItem>
              <MenuItem onClick={() => setViewMode('category')}>Category View</MenuItem>
            </MenuList>
          </Menu>
          
          {/* Create category button */}
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            colorScheme="green"
            onClick={onCategoryModalOpen}
          >
            Create Expense Category
          </Button>
        </HStack>
      </Flex>
      
      {/* Tabs for different views */}
      <Tabs mb={6} onChange={(index) => setActiveTab(['table', 'chart', 'breakdown'][index])}>
        <TabList>
          <Tab>Table View</Tab>
          <Tab>Chart View</Tab>
          <Tab>Category Breakdown</Tab>
        </TabList>
        
        <TabPanels>
          {/* Table View Tab */}
          <TabPanel p={0} pt={4}>
            {/* Table with monthly data */}
            <Table variant="simple" size="sm" borderWidth="1px" borderRadius="md">
              <Thead bg={headerBg}>
                <Tr>
                  <Th>Category</Th>
                  <Th isNumeric>Budget</Th>
                  <Th isNumeric>Actual</Th>
                  <Th isNumeric>Variance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {/* Income Section */}
                <Tr>
                  <Td fontWeight="bold" colSpan={4} bg={headerBg}>Income</Td>
                </Tr>
                
                {filteredCategories.income.length > 0 ? (
                  filteredCategories.income.map(category => {
                    const monthData = summaryData[displayMonth] || { income: { categories: {}, budgeted: 0 } };
                    const actual = monthData.income.categories[category] || 0;
                    // Approximate budget per category (dividing total budget by number of categories)
                    const budget = monthData.income.budgeted / (filteredCategories.income.length || 1);
                    const variance = actual - budget;
                    const variancePct = budget ? variance / budget : 0;
                    
                    return (
                      <Tr key={`income-${category}`}>
                        <Td>{category}</Td>
                        <Td isNumeric>${budget.toFixed(2)}</Td>
                        <Td isNumeric>${actual.toFixed(2)}</Td>
                        <Td isNumeric>
                          <Text>
                            {formatCurrency(variance)}
                            <Badge ml={2} colorScheme={variance >= 0 ? 'green' : 'red'}>
                              {variance >= 0 ? '+' : '-'}
                              {Math.abs(calculateVariancePercentage(actual, budget) * 100).toFixed(1)}%
                            </Badge>
                          </Text>
                        </Td>
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={4} textAlign="center">No income categories found</Td>
                  </Tr>
                )}
                
                {/* Income Totals */}
                <Tr bg={headerBg}>
                  <Td fontWeight="bold">Total Income</Td>
                  <Td isNumeric fontWeight="bold">
                    ${(summaryData[displayMonth]?.income?.budgeted || 0).toFixed(2)}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    ${(summaryData[displayMonth]?.income?.total || 0).toFixed(2)}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    <Text>
                      {formatCurrency(summaryData[displayMonth]?.income?.variance || 0)}
                      <Badge ml={2} colorScheme={(summaryData[displayMonth]?.income?.variance || 0) >= 0 ? 'green' : 'red'}>
                        {(summaryData[displayMonth]?.income?.variance || 0) >= 0 ? '+' : '-'}
                        {Math.abs(calculateVariancePercentage(summaryData[displayMonth]?.income?.total || 0, summaryData[displayMonth]?.income?.budgeted || 0) * 100).toFixed(1)}%
                      </Badge>
                    </Text>
                  </Td>
                </Tr>
                
                {/* Expenses Section */}
                <Tr>
                  <Td fontWeight="bold" colSpan={4} bg={headerBg}>Expenses</Td>
                </Tr>
                
                {filteredCategories.expenses.length > 0 ? (
                  filteredCategories.expenses.map(category => {
                    const monthData = summaryData[displayMonth] || { expenses: { categories: {}, budgeted: 0 } };
                    const actual = monthData.expenses.categories[category] || 0;
                    // Approximate budget per category (dividing total budget by number of categories)
                    const budget = monthData.expenses.budgeted / (filteredCategories.expenses.length || 1);
                    const variance = budget - actual; // Positive is good for expenses
                    const variancePct = budget ? variance / budget : 0;
                    
                    return (
                      <Tr key={`expense-${category}`}>
                        <Td>{category}</Td>
                        <Td isNumeric>${budget.toFixed(2)}</Td>
                        <Td isNumeric>${actual.toFixed(2)}</Td>
                        <Td isNumeric>
                          <Text>
                            {formatCurrency(variance)}
                            <Badge ml={2} colorScheme={variance >= 0 ? 'green' : 'red'}>
                              {variance >= 0 ? '+' : '-'}
                              {Math.abs(calculateVariancePercentage(actual, budget) * 100).toFixed(1)}%
                            </Badge>
                          </Text>
                        </Td>
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={4} textAlign="center">No expense categories found</Td>
                  </Tr>
                )}
                
                {/* Expense Totals */}
                <Tr bg={headerBg}>
                  <Td fontWeight="bold">Total Expenses</Td>
                  <Td isNumeric fontWeight="bold">
                    ${(summaryData[displayMonth]?.expenses?.budgeted || 0).toFixed(2)}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    ${(summaryData[displayMonth]?.expenses?.total || 0).toFixed(2)}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    <Text>
                      {formatCurrency(summaryData[displayMonth]?.expenses?.variance || 0)}
                      <Badge ml={2} colorScheme={(summaryData[displayMonth]?.expenses?.variance || 0) >= 0 ? 'green' : 'red'}>
                        {(summaryData[displayMonth]?.expenses?.variance || 0) >= 0 ? '+' : '-'}
                        {Math.abs(calculateVariancePercentage(summaryData[displayMonth]?.expenses?.total || 0, summaryData[displayMonth]?.expenses?.budgeted || 0) * 100).toFixed(1)}%
                      </Badge>
                    </Text>
                  </Td>
                </Tr>
                
                {/* Net Income */}
                <Tr bg={headerBg} fontWeight="bold">
                  <Td>Net Income</Td>
                  <Td isNumeric>
                    ${((summaryData[displayMonth]?.income?.budgeted || 0) - (summaryData[displayMonth]?.expenses?.budgeted || 0)).toFixed(2)}
                  </Td>
                  <Td isNumeric>
                    ${(summaryData[displayMonth]?.netIncome || 0).toFixed(2)}
                  </Td>
                  <Td isNumeric>
                    <Text>
                      {formatCurrency((summaryData[displayMonth]?.income?.variance || 0) - (summaryData[displayMonth]?.expenses?.variance || 0))}
                      <Badge ml={2} colorScheme={((summaryData[displayMonth]?.income?.variance || 0) - (summaryData[displayMonth]?.expenses?.variance || 0)) >= 0 ? 'green' : 'red'}>
                        {((summaryData[displayMonth]?.income?.variance || 0) - (summaryData[displayMonth]?.expenses?.variance || 0)) >= 0 ? '+' : '-'}
                        {Math.abs(calculateVariancePercentage(
                          (summaryData[displayMonth]?.income?.total || 0) - (summaryData[displayMonth]?.expenses?.total || 0),
                          (summaryData[displayMonth]?.income?.budgeted || 0) - (summaryData[displayMonth]?.expenses?.budgeted || 0)
                        ) * 100).toFixed(1)}%
                      </Badge>
                    </Text>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TabPanel>
          
          {/* Chart View Tab */}
          <TabPanel p={0} pt={4}>
            <Box p={4} textAlign="center">
              <Text>Chart view is currently not available</Text>
            </Box>
          </TabPanel>
          
          {/* Category Breakdown Tab */}
          <TabPanel p={0} pt={4}>
            <Flex direction={{ base: "column", md: "row" }} wrap="wrap" gap={6}>
              {/* Income Categories */}
              <Box flex="1" minW={{ base: "100%", md: "45%" }} mb={6}>
                <Heading size="md" mb={4}>Income Categories</Heading>
                {summaryData && summaryData.length > 0 && summaryData[displayMonth] ? (
                  <VStack align="stretch" spacing={3}>
                    {filteredCategories.income.map(category => {
                      const monthData = summaryData[displayMonth];
                      const budgeted = monthData?.income?.budgeted?.[category] || 0;
                      const actual = monthData?.income?.categories?.[category] || 0;
                      const percentage = actual / (budgeted || 1);
                      
                      return (
                        <Box key={`income-breakdown-${category}`} p={3} borderWidth="1px" borderRadius="md">
                          <Flex justify="space-between" mb={2}>
                            <Text fontWeight="medium">{category}</Text>
                            <Text fontWeight="bold">{formatCurrency(actual)}</Text>
                          </Flex>
                          <Progress 
                            value={Math.min(percentage * 100, 100)} 
                            colorScheme={percentage > 1 ? 'green' : percentage > 0.8 ? 'yellow' : 'red'} 
                            size="sm" 
                            borderRadius="full" 
                            mb={1} 
                          />
                          <Flex justify="space-between" fontSize="sm">
                            <Text>{formatPercentage(percentage)} of budget</Text>
                            <Text>{formatCurrency(budgeted)} budgeted</Text>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                ) : (
                  <Box p={4} textAlign="center">
                    <Text color="gray.500">No income data available</Text>
                  </Box>
                )}
              </Box>
              
              {/* Expense Categories */}
              <Box flex="1" minW={{ base: "100%", md: "45%" }}>
                <Heading size="md" mb={4}>Expense Categories</Heading>
                {summaryData && summaryData.length > 0 && summaryData[displayMonth] ? (
                  <VStack align="stretch" spacing={3}>
                    {filteredCategories.expenses.map(category => {
                      const monthData = summaryData[displayMonth];
                      const budgeted = monthData?.expenses?.budgeted?.[category] || 0;
                      const actual = monthData?.expenses?.categories?.[category] || 0;
                      const percentage = actual / (budgeted || 1);
                      
                      return (
                        <Box key={`expense-breakdown-${category}`} p={3} borderWidth="1px" borderRadius="md">
                          <Flex justify="space-between" mb={2}>
                            <Text fontWeight="medium">{category}</Text>
                            <Text fontWeight="bold">{formatCurrency(actual)}</Text>
                          </Flex>
                          <Progress 
                            value={Math.min(percentage * 100, 100)} 
                            colorScheme={percentage < 0.8 ? 'green' : percentage < 1 ? 'yellow' : 'red'} 
                            size="sm" 
                            borderRadius="full" 
                            mb={1} 
                          />
                          <Flex justify="space-between" fontSize="sm">
                            <Text>{formatPercentage(percentage)} of budget</Text>
                            <Text>{formatCurrency(budgeted)} budgeted</Text>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                ) : (
                  <Box p={4} textAlign="center">
                    <Text color="gray.500">No expense data available</Text>
                  </Box>
                )}
              </Box>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Add category modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={onCategoryModalClose}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Category</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isInvalid={categoryFormErrors.name} mb={4}>
              <FormLabel>Category Name</FormLabel>
              <Input 
                type="text" 
                name="name" 
                value={categoryForm.name} 
                onChange={handleCategoryFormChange} 
              />
              {categoryFormErrors.name && (
                <FormErrorMessage>{categoryFormErrors.name}</FormErrorMessage>
              )}
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Category Type</FormLabel>
              <RadioGroup 
                value={categoryForm.type}
                onChange={(value) => setCategoryForm({...categoryForm, type: value})}
              >
                <Stack direction="row">
                  <Radio value="income">Income</Radio>
                  <Radio value="expense">Expense</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
            
            <FormControl isInvalid={categoryFormErrors.budget} mb={4}>
              <FormLabel>Budget Amount</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiDollarSign color="gray.300" />
                </InputLeftElement>
                <NumberInput 
                  min={0}
                  value={categoryForm.budget}
                  onChange={(value) => setCategoryForm({...categoryForm, budget: value})}
                  width="100%"
                >
                  <NumberInputField pl={8} />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </InputGroup>
              {categoryFormErrors.budget && (
                <FormErrorMessage>{categoryFormErrors.budget}</FormErrorMessage>
              )}
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Input 
                type="text" 
                name="description" 
                value={categoryForm.description} 
                onChange={handleCategoryFormChange} 
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCategoryModalClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleCreateCategory}
            >
              Create Category
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete confirmation dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Category
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={() => {
                // Implement delete functionality
                onDeleteClose();
              }} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default withErrorHandling(BudgetSummary);
