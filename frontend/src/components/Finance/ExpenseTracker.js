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
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiPlus, FiFilter, FiMoreVertical, FiRefreshCw } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';
import { useError } from '../../context/ErrorContext';
import ErrorWrapper from '../ErrorWrapper';
import withErrorHandling from '../withErrorHandling';

const ExpenseTracker = ({ compact = false, limit = 10 }) => {
  const { expenses, addTransaction, deleteTransaction, loading } = useFinance();
  const { registerError, clearError } = useError();
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Other',
    type: 'expense',
    payment_method: 'credit_card'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  
  // Colors
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');
  
  // Clear errors on mount and unmount
  useEffect(() => {
    clearError('expense-tracker');
    
    return () => {
      clearError('expense-tracker');
    };
  }, [clearError]);
  
  // Filter expenses based on filters
  const handleFilter = (filterParams) => {
    try {
      // Apply filters to expenses
      let filtered = [...expenses];
      
      // Filter by type
      if (filterParams.type !== 'all') {
        filtered = filtered.filter(expense => expense.type === filterParams.type);
      }
      
      // Filter by category
      if (filterParams.category !== 'all') {
        filtered = filtered.filter(expense => expense.category === filterParams.category);
      }
      
      // Filter by date
      if (filterParams.date !== 'all') {
        const today = new Date();
        let dateLimit;
        
        switch (filterParams.date) {
          case 'today':
            dateLimit = new Date(today.setHours(0, 0, 0, 0));
            break;
          case 'week':
            dateLimit = new Date(today.setDate(today.getDate() - 7));
            break;
          case 'month':
            dateLimit = new Date(today.setMonth(today.getMonth() - 1));
            break;
          case 'year':
            dateLimit = new Date(today.setFullYear(today.getFullYear() - 1));
            break;
          default:
            dateLimit = null;
        }
        
        if (dateLimit) {
          filtered = filtered.filter(expense => new Date(expense.date) >= dateLimit);
        }
      }
      
      // Filter by amount
      if (filterParams.amount !== 'all') {
        let min = 0, max = Infinity;
        
        switch (filterParams.amount) {
          case 'under50':
            max = 50;
            break;
          case '50to100':
            min = 50;
            max = 100;
            break;
          case '100to500':
            min = 100;
            max = 500;
            break;
          case 'over500':
            min = 500;
            break;
          default:
            break;
        }
        
        filtered = filtered.filter(expense => {
          const amount = parseFloat(expense.amount);
          return amount >= min && amount <= max;
        });
      }
      
      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Apply limit if provided
      if (limit && filtered.length > limit) {
        filtered = filtered.slice(0, limit);
      }
      
      setFilteredExpenses(filtered);
    } catch (error) {
      console.error('Error filtering expenses:', error);
      setLoadError('Error filtering expenses');
      registerError('expense-tracker', { message: 'Failed to filter expenses' });
    }
  };
  
  // Initialize filtered expenses with all expenses
  useEffect(() => {
    try {
      if (expenses) {
        let filtered = [...expenses];
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Apply limit if provided
        if (limit && filtered.length > limit) {
          filtered = filtered.slice(0, limit);
        }
        
        setFilteredExpenses(filtered);
        setLoadError(null);
      }
    } catch (error) {
      console.error('Error initializing expense data:', error);
      setLoadError('Error loading expense data');
      registerError('expense-tracker', { message: 'Failed to load expense data' });
    }
  }, [expenses, limit, registerError]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
    
    setFormData({
      ...formData,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    });
  };
  
  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.amount) {
      errors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || formData.amount <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.date) {
      errors.date = 'Date is required';
    } else {
      // Validate date format and range
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(formData.date)) {
        errors.date = 'Invalid date format (YYYY-MM-DD)';
      } else {
        const selectedDate = new Date(formData.date);
        const today = new Date();
        
        if (isNaN(selectedDate.getTime())) {
          errors.date = 'Invalid date';
        } else if (selectedDate > today) {
          errors.date = 'Date cannot be in the future';
        }
      }
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setSubmitError(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addTransaction(formData);
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Other',
        type: 'expense',
        payment_method: 'credit_card'
      });
      
      // Close modal
      onClose();
      
      // Clear errors
      clearError('expense-tracker');
    } catch (error) {
      console.error('Error adding transaction:', error);
      setSubmitError('Failed to add transaction. Please try again.');
      registerError('expense-tracker', { message: 'Failed to add transaction' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle transaction deletion
  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      clearError('expense-tracker');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      registerError('expense-tracker', { message: 'Failed to delete transaction' });
    }
  };
  
  // Render error state
  if (loadError) {
    return (
      <ErrorWrapper 
        error={{ message: loadError }} 
        onRetry={() => {
          setLoadError(null);
          clearError('expense-tracker');
          // The data will be refreshed via the context
        }} 
        componentName="Expense Tracker" 
        showRetry={true} 
      />
    );
  }
  
  // Render loading state
  if (loading) {
    return (
      <Flex justify="center" align="center" height={compact ? "200px" : "300px"}>
        <Spinner size="xl" color="primary.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      {!compact && (
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontSize="xl" fontWeight="bold">Expense Tracker</Text>
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="primary" 
            onClick={onOpen}
          >
            Add Transaction
          </Button>
        </Flex>
      )}
      
      {!compact && <ExpenseFilter onFilter={handleFilter} />}
      
      {filteredExpenses.length === 0 ? (
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          borderStyle="dashed"
          textAlign="center"
        >
          <Text color="gray.500" mb={2}>No transactions found</Text>
          <Button 
            size="sm" 
            colorScheme="primary" 
            leftIcon={<FiPlus />}
            onClick={onOpen}
          >
            Add Transaction
          </Button>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" size={compact ? "sm" : "md"}>
            <Thead>
              <Tr bg={headerBg}>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th>Date</Th>
                <Th isNumeric>Amount</Th>
                {!compact && <Th>Method</Th>}
                <Th width="50px"></Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredExpenses.map((expense) => (
                <Tr 
                  key={expense.id} 
                  _hover={{ bg: hoverBg }}
                  transition="background 0.2s"
                >
                  <Td>
                    <Text fontWeight="medium">{expense.description}</Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={getCategoryColorScheme(expense.category)}>
                      {expense.category}
                    </Badge>
                  </Td>
                  <Td>{formatDate(expense.date)}</Td>
                  <Td isNumeric>
                    <Text 
                      fontWeight="semibold" 
                      color={expense.type === 'expense' ? 'red.500' : 'green.500'}
                    >
                      {expense.type === 'expense' ? '-' : '+'}
                      ${parseFloat(expense.amount).toFixed(2)}
                    </Text>
                  </Td>
                  {!compact && (
                    <Td>{formatPaymentMethod(expense.payment_method)}</Td>
                  )}
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
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
        </Box>
      )}
      
      {/* Add Transaction Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {submitError && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                {submitError}
              </Alert>
            )}
            
            <FormControl mb={4} isInvalid={formErrors.description}>
              <FormLabel>Description</FormLabel>
              <Input 
                name="description" 
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Transaction description"
                isDisabled={isSubmitting}
              />
              {formErrors.description && <Text color="red.500" fontSize="sm">{formErrors.description}</Text>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.amount}>
              <FormLabel>Amount</FormLabel>
              <Input 
                name="amount" 
                type="number" 
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                isDisabled={isSubmitting}
              />
              {formErrors.amount && <Text color="red.500" fontSize="sm">{formErrors.amount}</Text>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.date}>
              <FormLabel>Date</FormLabel>
              <Input 
                name="date" 
                type="date" 
                value={formData.date}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                isDisabled={isSubmitting}
              />
              {formErrors.date && <Text color="red.500" fontSize="sm">{formErrors.date}</Text>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.category}>
              <FormLabel>Category</FormLabel>
              <Select 
                name="category" 
                value={formData.category}
                onChange={handleInputChange}
                isDisabled={isSubmitting}
              >
                <option value="Housing">Housing</option>
                <option value="Food">Food</option>
                <option value="Transportation">Transportation</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Income">Income</option>
                <option value="Other">Other</option>
              </Select>
              {formErrors.category && <Text color="red.500" fontSize="sm">{formErrors.category}</Text>}
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Type</FormLabel>
              <Select 
                name="type" 
                value={formData.type}
                onChange={handleInputChange}
                isDisabled={isSubmitting}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Payment Method</FormLabel>
              <Select 
                name="payment_method" 
                value={formData.payment_method}
                onChange={handleInputChange}
                isDisabled={isSubmitting}
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_payment">Mobile Payment</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              colorScheme="primary" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Saving"
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

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
    case 'Income':
      return 'green';
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

export default withErrorHandling(ExpenseTracker, {
  componentName: 'Expense Tracker',
  onError: (error) => console.error('ExpenseTracker error:', error)
});
