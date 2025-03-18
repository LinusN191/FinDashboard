import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
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
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  IconButton,
  Stack,
  Alert,
  AlertIcon,
  useDisclosure,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FiPlus, FiCalendar, FiEdit, FiTrash2, FiRepeat, FiDollarSign } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';

const IncomeSourceCard = ({ data, onEdit, onDelete }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Get color based on income source type
  const getSourceColor = (source) => {
    switch (source.toLowerCase()) {
      case 'salary':
        return 'green';
      case 'freelance':
        return 'purple';
      case 'investments':
        return 'blue';
      case 'business':
        return 'orange';
      case 'rental':
        return 'cyan';
      case 'other':
      default:
        return 'gray';
    }
  };
  
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={cardBg}
      position="relative"
      _hover={{
        boxShadow: 'md',
        borderColor: useColorModeValue('gray.300', 'gray.500')
      }}
      transition="all 0.2s"
    >
      <Flex justifyContent="space-between" alignItems="center" mb={3}>
        <Badge 
          colorScheme={getSourceColor(data.source)} 
          px={2} 
          py={1} 
          borderRadius="md"
        >
          {data.source}
        </Badge>
        {data.isRecurring && (
          <Badge colorScheme="teal" px={2} py={1} borderRadius="md">
            <Flex alignItems="center">
              <FiRepeat style={{ marginRight: '4px' }} />
              {data.frequency}
            </Flex>
          </Badge>
        )}
      </Flex>
      
      <Heading size="md" mb={2}>{data.name}</Heading>
      
      <Stat mt={4}>
        <StatLabel>Amount</StatLabel>
        <StatNumber>{formatCurrency(data.amount)}</StatNumber>
        {data.previousAmount && (
          <StatHelpText>
            <StatArrow 
              type={data.amount >= data.previousAmount ? 'increase' : 'decrease'} 
            />
            {Math.abs(((data.amount - data.previousAmount) / data.previousAmount) * 100).toFixed(1)}%
            {' from last period'}
          </StatHelpText>
        )}
      </Stat>
      
      {data.nextDate && (
        <Flex alignItems="center" mt={2} color="gray.500">
          <FiCalendar style={{ marginRight: '8px' }} />
          <Text>Next: {new Date(data.nextDate).toLocaleDateString()}</Text>
        </Flex>
      )}
      
      <Flex mt={4} justifyContent="flex-end">
        <IconButton
          icon={<FiEdit />}
          aria-label="Edit income"
          size="sm"
          colorScheme="blue"
          variant="ghost"
          mr={2}
          onClick={() => onEdit(data)}
        />
        <IconButton
          icon={<FiTrash2 />}
          aria-label="Delete income"
          size="sm"
          colorScheme="red"
          variant="ghost"
          onClick={() => onDelete(data.id)}
        />
      </Flex>
    </Box>
  );
};

const IncomeManager = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    createExpense, 
    deleteExpense, 
    expenses, 
    loading,
    error,
    fetchExpenses,
    dashboardSummary
  } = useFinance();
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // State for income sources
  const [incomeSources, setIncomeSources] = useState([]);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    source: 'salary',
    isRecurring: false,
    frequency: 'monthly',
    nextDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Initialize income sources from expenses with positive amounts
  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const incomes = expenses.filter(expense => expense.amount > 0 || expense.type === 'income');
      
      // Group recurring incomes
      const sources = [];
      const processedIds = new Set();
      
      incomes.forEach(income => {
        if (!processedIds.has(income.id)) {
          // Basic information for all incomes
          const source = {
            id: income.id,
            name: income.title || 'Unnamed Income',
            amount: Math.abs(income.amount),
            source: income.category || 'Other',
            notes: income.notes || '',
            date: income.date,
            isRecurring: income.recurring || false
          };
          
          // Add recurring information if available
          if (income.recurring) {
            source.frequency = income.frequency || 'monthly';
            source.nextDate = income.next_date || '';
          }
          
          sources.push(source);
          processedIds.add(income.id);
        }
      });
      
      setIncomeSources(sources);
    }
  }, [expenses]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'Valid amount is required';
    }
    
    if (!formData.source) {
      errors.source = 'Source is required';
    }
    
    if (formData.isRecurring) {
      if (!formData.frequency) {
        errors.frequency = 'Frequency is required for recurring income';
      }
      
      if (!formData.nextDate) {
        errors.nextDate = 'Next date is required for recurring income';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // Format the data for the createExpense function
      const incomeData = {
        title: formData.name,
        amount: Math.abs(formData.amount), // Ensure positive amount
        category: formData.source,
        type: 'income',
        date: formData.nextDate,
        recurring: formData.isRecurring,
        frequency: formData.isRecurring ? formData.frequency : null,
        next_date: formData.isRecurring ? formData.nextDate : null,
        notes: formData.notes,
        payment_method: 'direct_deposit'
      };
      
      if (editingIncome) {
        // Update existing income (delete and recreate for now)
        await deleteExpense(editingIncome.id);
        await createExpense(incomeData);
        toast({
          title: "Income updated",
          description: `${formData.name} has been updated successfully.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new income
        await createExpense(incomeData);
        toast({
          title: "Income added",
          description: `${formData.name} has been added to your income sources.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Reset form and close modal
      handleCloseModal();
      
      // Refresh expenses to update the income sources list
      fetchExpenses();
      
    } catch (err) {
      console.error('Error saving income:', err);
      toast({
        title: "Error",
        description: "Failed to save income. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle income deletion
  const handleDeleteIncome = async (id) => {
    try {
      await deleteExpense(id);
      toast({
        title: "Income deleted",
        description: "The income source has been removed.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh expenses to update the income sources list
      fetchExpenses();
      
    } catch (err) {
      console.error('Error deleting income:', err);
      toast({
        title: "Error",
        description: "Failed to delete income. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle income editing
  const handleEditIncome = (income) => {
    setEditingIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount,
      source: income.source,
      isRecurring: income.isRecurring,
      frequency: income.frequency || 'monthly',
      nextDate: income.nextDate || new Date().toISOString().split('T')[0],
      notes: income.notes || ''
    });
    onOpen();
  };
  
  // Close modal and reset form
  const handleCloseModal = () => {
    setFormData({
      name: '',
      amount: '',
      source: 'salary',
      isRecurring: false,
      frequency: 'monthly',
      nextDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setFormErrors({});
    setEditingIncome(null);
    onClose();
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Calculate total monthly income
  const totalMonthlyIncome = incomeSources.reduce((total, source) => {
    // Only add recurring monthly incomes or adjust based on frequency
    if (source.isRecurring) {
      switch (source.frequency) {
        case 'daily':
          return total + (source.amount * 30); // Approximate
        case 'weekly':
          return total + (source.amount * 4.33); // Approximate weeks in a month
        case 'biweekly':
          return total + (source.amount * 2.17); // Approximate
        case 'monthly':
          return total + source.amount;
        case 'quarterly':
          return total + (source.amount / 3);
        case 'annually':
          return total + (source.amount / 12);
        default:
          return total + source.amount;
      }
    } else {
      // For non-recurring, only count if it's from the current month
      const incomeDate = new Date(source.date);
      const currentDate = new Date();
      if (incomeDate.getMonth() === currentDate.getMonth() && 
          incomeDate.getFullYear() === currentDate.getFullYear()) {
        return total + source.amount;
      }
      return total;
    }
  }, 0);
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Heading size="lg" mb={1}>Income Manager</Heading>
          <Text color="gray.500">Track and manage your income sources</Text>
        </Box>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary"
          onClick={onOpen}
        >
          Add Income
        </Button>
      </Flex>
      
      <Box
        p={4} 
        borderWidth="1px" 
        borderRadius="lg" 
        borderColor={borderColor}
        bg={cardBg}
        mb={6}
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Stat>
            <StatLabel>Total Monthly Income</StatLabel>
            <StatNumber>{formatCurrency(totalMonthlyIncome)}</StatNumber>
            {dashboardSummary && dashboardSummary.total_expenses && dashboardSummary.total_expenses !== 0 && (
              <StatHelpText>
                {Math.round((totalMonthlyIncome / Math.abs(dashboardSummary.total_expenses)) * 100)}% of monthly expenses
              </StatHelpText>
            )}
            {(!dashboardSummary || !dashboardSummary.total_expenses || dashboardSummary.total_expenses === 0) && (
              <StatHelpText>
                No expense data available
              </StatHelpText>
            )}
          </Stat>
          
          <Stat>
            <StatLabel>Income Sources</StatLabel>
            <StatNumber>{incomeSources.length}</StatNumber>
            <StatHelpText>
              {incomeSources.filter(s => s.isRecurring).length} recurring
            </StatHelpText>
          </Stat>
        </Flex>
      </Box>
      
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Flex justify="center" my={10}>
          <Text>Loading income sources...</Text>
        </Flex>
      ) : (
        <>
          {incomeSources.length === 0 ? (
            <Box 
              p={8} 
              borderWidth="1px" 
              borderRadius="lg" 
              borderStyle="dashed"
              textAlign="center"
            >
              <Heading size="md" mb={4}>No Income Sources Yet</Heading>
              <Text color="gray.500" mb={4}>
                Add your first income source to start tracking your earnings.
              </Text>
              <Button 
                leftIcon={<FiDollarSign />} 
                colorScheme="primary" 
                onClick={onOpen}
              >
                Add Income Source
              </Button>
            </Box>
          ) : (
            <Box mt={4}>
              <Heading size="md" mb={4}>Your Income Sources</Heading>
              
              <Stack spacing={4}>
                {incomeSources.map(income => (
                  <IncomeSourceCard 
                    key={income.id}
                    data={income}
                    onEdit={handleEditIncome}
                    onDelete={handleDeleteIncome}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
      
      {/* Add/Edit Income Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingIncome ? 'Edit Income Source' : 'Add Income Source'}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <FormControl mb={4} isInvalid={formErrors.name}>
              <FormLabel>Income Name</FormLabel>
              <Input 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Salary, Freelance Work"
              />
              {formErrors.name && <FormErrorMessage>{formErrors.name}</FormErrorMessage>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.amount}>
              <FormLabel>Amount</FormLabel>
              <NumberInput min={0}>
                <NumberInputField
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {formErrors.amount && <FormErrorMessage>{formErrors.amount}</FormErrorMessage>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.source}>
              <FormLabel>Income Source</FormLabel>
              <Select 
                name="source"
                value={formData.source}
                onChange={handleInputChange}
              >
                <option value="salary">Salary</option>
                <option value="freelance">Freelance</option>
                <option value="investments">Investments</option>
                <option value="business">Business</option>
                <option value="rental">Rental</option>
                <option value="sideGig">Side Gig</option>
                <option value="gifts">Gifts</option>
                <option value="other">Other</option>
              </Select>
              {formErrors.source && <FormErrorMessage>{formErrors.source}</FormErrorMessage>}
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Is this a recurring income?</FormLabel>
              <Switch 
                name="isRecurring"
                isChecked={formData.isRecurring}
                onChange={handleInputChange}
                colorScheme="primary"
              />
            </FormControl>
            
            {formData.isRecurring && (
              <>
                <FormControl mb={4} isInvalid={formErrors.frequency}>
                  <FormLabel>Frequency</FormLabel>
                  <Select 
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </Select>
                  {formErrors.frequency && <FormErrorMessage>{formErrors.frequency}</FormErrorMessage>}
                </FormControl>
                
                <FormControl mb={4} isInvalid={formErrors.nextDate}>
                  <FormLabel>Next Payment Date</FormLabel>
                  <Input 
                    name="nextDate"
                    type="date"
                    value={formData.nextDate}
                    onChange={handleInputChange}
                  />
                  {formErrors.nextDate && <FormErrorMessage>{formErrors.nextDate}</FormErrorMessage>}
                </FormControl>
              </>
            )}
            
            <FormControl mb={4}>
              <FormLabel>Notes (Optional)</FormLabel>
              <Input 
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional details"
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button 
              colorScheme="primary" 
              onClick={handleSubmit}
              isLoading={loading}
            >
              {editingIncome ? 'Update Income' : 'Add Income'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default IncomeManager;
