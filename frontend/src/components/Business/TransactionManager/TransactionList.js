import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Flex,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  HStack,
  useColorModeValue,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiFilter, 
  FiDownload, 
  FiMoreVertical,
  FiSearch,
  FiChevronDown
} from 'react-icons/fi';
import { useBusiness } from '../../../context/BusinessContext';
import TransactionForm from './TransactionForm';

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
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

const TransactionList = ({ transactions = [], businessId }) => {
  const { 
    TRANSACTION_CATEGORIES,
    deleteTransaction
  } = useBusiness();
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filter, setFilter] = useState({
    type: '',
    category: '',
    search: '',
    dateRange: 'all'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by type
    if (filter.type && transaction.type !== filter.type) {
      return false;
    }
    
    // Filter by category
    if (filter.category && transaction.category !== filter.category) {
      return false;
    }
    
    // Filter by search term
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      const matchesDescription = transaction.description.toLowerCase().includes(searchTerm);
      const matchesReference = transaction.reference?.toLowerCase().includes(searchTerm);
      const matchesCategory = transaction.category.toLowerCase().includes(searchTerm);
      
      if (!matchesDescription && !matchesReference && !matchesCategory) {
        return false;
      }
    }
    
    // Filter by date range
    if (filter.dateRange !== 'all') {
      const now = new Date();
      const transactionDate = new Date(transaction.date);
      
      if (filter.dateRange === 'thisMonth') {
        if (transactionDate.getMonth() !== now.getMonth() || 
            transactionDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (filter.dateRange === 'lastMonth') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        
        if (transactionDate.getMonth() !== lastMonth || 
            transactionDate.getFullYear() !== lastMonthYear) {
          return false;
        }
      } else if (filter.dateRange === 'thisYear') {
        if (transactionDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle edit transaction
  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsEditing(true);
    onOpen();
  };
  
  // Handle create transaction
  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setIsEditing(false);
    onOpen();
  };
  
  // Handle delete transaction
  const handleDeleteTransaction = async (transaction) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      const success = await deleteTransaction(businessId, transaction.id);
      
      if (!success) {
        setError('Failed to delete transaction. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Build all categories list from income and expense categories
  const allCategories = [
    ...TRANSACTION_CATEGORIES.income,
    ...TRANSACTION_CATEGORIES.expense
  ].sort();
  
  return (
    <Box>
      {/* Error message */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Box 
        mb={4} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Text fontSize="lg" fontWeight="medium" mb={3}>
          Filters & Actions
        </Text>
        
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          gap={4}
          wrap="wrap"
        >
          {/* Search */}
          <InputGroup maxW={{ base: "100%", md: "220px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input 
              placeholder="Search transactions..." 
              value={filter.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </InputGroup>
          
          {/* Type filter */}
          <Select 
            placeholder="All Types" 
            maxW={{ base: "100%", md: "150px" }}
            value={filter.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          
          {/* Category filter */}
          <Select 
            placeholder="All Categories" 
            maxW={{ base: "100%", md: "200px" }}
            value={filter.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            {allCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>
          
          {/* Date range filter */}
          <Select 
            placeholder="Date Range" 
            maxW={{ base: "100%", md: "150px" }}
            value={filter.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
          </Select>
          
          <HStack ml={{ base: 0, md: 'auto' }}>
            <Button 
              leftIcon={<FiPlus />} 
              colorScheme="blue"
              onClick={handleCreateTransaction}
            >
              Add Transaction
            </Button>
            
            <Menu>
              <MenuButton as={Button} rightIcon={<FiChevronDown />} variant="outline">
                Actions
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiDownload />}>Export Transactions</MenuItem>
                <MenuItem icon={<FiFilter />}>Clear Filters</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>
      
      {/* Transactions Table */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        overflow="hidden"
      >
        {isDeleting && (
          <Flex justify="center" align="center" py={4}>
            <Spinner mr={2} />
            <Text>Deleting transaction...</Text>
          </Flex>
        )}
        
        {filteredTransactions.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text>No transactions found. Adjust filters or add a new transaction.</Text>
          </Box>
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th>Reference</Th>
                <Th isNumeric>Amount</Th>
                <Th>Type</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredTransactions.map(transaction => (
                <Tr key={transaction.id}>
                  <Td>{formatDate(transaction.date)}</Td>
                  <Td>{transaction.description}</Td>
                  <Td>{transaction.category}</Td>
                  <Td>{transaction.reference || '—'}</Td>
                  <Td isNumeric>{formatCurrency(transaction.amount, transaction.currency)}</Td>
                  <Td>
                    <Badge 
                      colorScheme={transaction.type === 'income' ? 'green' : 'red'}
                      borderRadius="full"
                      px={2}
                    >
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Edit transaction"
                        icon={<FiEdit2 />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTransaction(transaction)}
                      />
                      <IconButton
                        aria-label="Delete transaction"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteTransaction(transaction)}
                        isLoading={isDeleting}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
      
      {/* Transaction Form Modal */}
      <TransactionForm
        isOpen={isOpen}
        onClose={onClose}
        businessId={businessId}
        transaction={selectedTransaction}
        isEditing={isEditing}
      />
    </Box>
  );
};

export default TransactionList;
