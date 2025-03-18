import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Heading,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';
import { FiPlus, FiFilter, FiMoreVertical } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';

// Expense Filter Component
const ExpenseFilter = ({ onFilter }) => {
  const [filterParams, setFilterParams] = useState({
    category: 'all',
    date: 'all',
    amount: 'all'
  });
  
  // Handle filter change
  const handleFilterChange = (param, value) => {
    const newParams = { ...filterParams, [param]: value };
    setFilterParams(newParams);
    onFilter(newParams);
  };
  
  return (
    <Flex gap={2} mb={4} flexWrap="wrap">
      <Select 
        size="sm" 
        width="auto" 
        value={filterParams.category}
        onChange={(e) => handleFilterChange('category', e.target.value)}
      >
        <option value="all">All Categories</option>
        <option value="Housing">Housing</option>
        <option value="Food">Food</option>
        <option value="Transportation">Transportation</option>
        <option value="Utilities">Utilities</option>
        <option value="Entertainment">Entertainment</option>
        <option value="Shopping">Shopping</option>
        <option value="Healthcare">Healthcare</option>
        <option value="Other">Other</option>
      </Select>
      
      <Select 
        size="sm" 
        width="auto" 
        value={filterParams.date}
        onChange={(e) => handleFilterChange('date', e.target.value)}
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="year">This Year</option>
      </Select>
      
      <Select 
        size="sm" 
        width="auto" 
        value={filterParams.amount}
        onChange={(e) => handleFilterChange('amount', e.target.value)}
      >
        <option value="all">All Amounts</option>
        <option value="0-50">$0 - $50</option>
        <option value="50-100">$50 - $100</option>
        <option value="100-500">$100 - $500</option>
        <option value="500+">$500+</option>
      </Select>
    </Flex>
  );
};

const ExpenseTracker = () => {
  const { expenses, createExpense, deleteExpense, loading } = useFinance();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'credit_card',
    notes: ''
  });
  
  // Initialize filtered expenses with all expenses
  useEffect(() => {
    setFilteredExpenses(expenses);
  }, [expenses]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For amount, convert to number
    if (name === 'amount') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      await createExpense(formData);
      onClose();
      // Reset form
      setFormData({
        title: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'credit_card',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };
  
  // Handle expense deletion
  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };
  
  // Handle filtering expenses
  const handleFilter = (filterParams) => {
    let filtered = [...expenses];
    
    // Filter by category
    if (filterParams.category !== 'all') {
      filtered = filtered.filter(expense => 
        expense.category === filterParams.category
      );
    }
    
    // Filter by date
    if (filterParams.date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        
        switch (filterParams.date) {
          case 'today':
            return expenseDate >= today;
          case 'week':
            return expenseDate >= weekStart;
          case 'month':
            return expenseDate >= monthStart;
          case 'year':
            return expenseDate >= yearStart;
          default:
            return true;
        }
      });
    }
    
    // Filter by amount
    if (filterParams.amount !== 'all') {
      const [min, max] = filterParams.amount.split('-');
      
      filtered = filtered.filter(expense => {
        if (min === '0' && max === '50') {
          return expense.amount <= 50;
        } else if (min === '50' && max === '100') {
          return expense.amount > 50 && expense.amount <= 100;
        } else if (min === '100' && max === '500') {
          return expense.amount > 100 && expense.amount <= 500;
        } else if (min === '500+') {
          return expense.amount > 500;
        }
        return true;
      });
    }
    
    setFilteredExpenses(filtered);
  };
  
  // Generate mock expenses if needed for development
  const mockExpenses = [
    {
      id: 'expense1',
      title: 'Grocery Shopping',
      amount: 85.47,
      category: 'Food',
      date: '2024-03-28',
      payment_method: 'credit_card'
    },
    {
      id: 'expense2',
      title: 'Electricity Bill',
      amount: 124.99,
      category: 'Utilities',
      date: '2024-03-27',
      payment_method: 'bank_transfer'
    },
    {
      id: 'expense3',
      title: 'Movie Tickets',
      amount: 32.50,
      category: 'Entertainment',
      date: '2024-03-25',
      payment_method: 'debit_card'
    },
    {
      id: 'expense4',
      title: 'Gas',
      amount: 45.75,
      category: 'Transportation',
      date: '2024-03-24',
      payment_method: 'credit_card'
    },
    {
      id: 'expense5',
      title: 'Dinner with Friends',
      amount: 78.30,
      category: 'Food',
      date: '2024-03-23',
      payment_method: 'cash'
    }
  ];
  
  // Use actual expenses or mock data for development
  const displayExpenses = filteredExpenses.length > 0 ? filteredExpenses : 
                          expenses.length > 0 ? expenses : mockExpenses;
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold">Expense Tracker</Text>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary" 
          onClick={onOpen}
        >
          Add Expense
        </Button>
      </Flex>
      
      <ExpenseFilter onFilter={handleFilter} />
      
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        overflow="hidden"
        boxShadow="sm"
        bg={useColorModeValue('white', 'gray.700')}
      >
        <Table variant="simple" size="sm">
          <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
            <Tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th isNumeric>Amount</Th>
              <Th>Date</Th>
              <Th>Payment Method</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {displayExpenses.map((expense) => (
              <Tr key={expense.id}>
                <Td fontWeight="medium">{expense.title}</Td>
                <Td>
                  <Badge colorScheme={getCategoryColorScheme(expense.category)}>
                    {expense.category}
                  </Badge>
                </Td>
                <Td isNumeric fontWeight="semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(expense.amount)}
                </Td>
                <Td>{formatDate(expense.date)}</Td>
                <Td>
                  <Badge variant="outline">
                    {formatPaymentMethod(expense.payment_method)}
                  </Badge>
                </Td>
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                      size="sm"
                      aria-label="More options"
                    />
                    <MenuList>
                      <MenuItem onClick={() => handleDelete(expense.id)}>
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        
        {displayExpenses.length === 0 && (
          <Box p={4} textAlign="center">
            <Text color="gray.500">No expenses found</Text>
          </Box>
        )}
      </Box>
      
      {/* Add Expense Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Expense</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Title</FormLabel>
              <Input 
                name="title" 
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Expense title"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Amount</FormLabel>
              <Input 
                name="amount" 
                type="number" 
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Category</FormLabel>
              <Select 
                name="category" 
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Select category"
              >
                <option value="Housing">Housing</option>
                <option value="Food">Food</option>
                <option value="Transportation">Transportation</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Other">Other</option>
              </Select>
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Date</FormLabel>
              <Input 
                name="date" 
                type="date" 
                value={formData.date}
                onChange={handleInputChange}
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Payment Method</FormLabel>
              <Select 
                name="payment_method" 
                value={formData.payment_method}
                onChange={handleInputChange}
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="digital_wallet">Digital Wallet</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Notes (Optional)</FormLabel>
              <Input 
                name="notes" 
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional details"
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="primary" 
              onClick={handleSubmit}
              isLoading={loading}
              isDisabled={!formData.title || !formData.amount || !formData.category}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Helper functions
const getCategoryColorScheme = (category) => {
  switch (category) {
    case 'Housing':
      return 'blue';
    case 'Food':
      return 'green';
    case 'Transportation':
      return 'yellow';
    case 'Utilities':
      return 'purple';
    case 'Entertainment':
      return 'pink';
    case 'Shopping':
      return 'orange';
    case 'Healthcare':
      return 'teal';
    default:
      return 'gray';
  }
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatPaymentMethod = (method) => {
  return method
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default ExpenseTracker;
