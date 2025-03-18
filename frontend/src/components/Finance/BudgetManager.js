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
  SimpleGrid,
  Text,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useDisclosure,
  useColorModeValue,
  useToast,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Spinner
} from '@chakra-ui/react';
import { FiPlus, FiSave, FiAlertCircle } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';
import { useError } from '../../context/ErrorContext';
import withErrorHandling from '../withErrorHandling';

// Budget progress card component
const BudgetCard = ({ category, amount, spent, period }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Calculate percentage spent
  const percentage = Math.min(Math.round((spent / amount) * 100), 100);
  
  // Determine progress color based on percentage
  let progressColor = 'green.400';
  if (percentage > 85) {
    progressColor = 'red.400';
  } else if (percentage > 65) {
    progressColor = 'orange.400';
  }
  
  // Determine if over budget
  const isOverBudget = spent > amount;
  
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={cardBg}
      boxShadow="sm"
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.500">{category}</StatLabel>
        <StatNumber fontSize="2xl">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(amount)}
        </StatNumber>
        <StatHelpText fontSize="xs">{period}</StatHelpText>
      </Stat>
      
      <Text mt={2} fontSize="sm">
        Spent: {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(spent)} 
        {isOverBudget && <Text as="span" color="red.500"> (Over budget)</Text>}
      </Text>
      
      <Progress 
        value={percentage} 
        colorScheme={progressColor.split('.')[0]} 
        size="sm" 
        mt={2} 
        borderRadius="full"
      />
      
      <Text mt={1} fontSize="xs" textAlign="right">
        {percentage}% used
      </Text>
    </Box>
  );
};

const BudgetManager = ({ compact = false }) => {
  const { budgets, dashboardSummary, createBudget, loading } = useFinance();
  const { registerError, clearError } = useError();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
    description: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  
  useEffect(() => {
    // Clear any previous errors when component mounts
    clearError('budget-manager');
    
    return () => {
      // Clean up by clearing errors when unmounting
      clearError('budget-manager');
    };
  }, [clearError]);

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

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    if (!formData.amount) {
      errors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || formData.amount <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.period) {
      errors.period = 'Period is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSaveError(null);
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await createBudget(formData);
      onClose();
      
      // Show success toast
      toast({
        title: "Budget created",
        description: `${formData.category} budget has been added successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Reset form
      setFormData({
        category: '',
        amount: '',
        period: 'monthly',
        description: ''
      });
      
      // Clear any errors
      clearError('budget-manager');
    } catch (error) {
      console.error('Error creating budget:', error);
      setSaveError('Failed to create budget. Please try again.');
      registerError('budget-manager', { message: 'Failed to create budget' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get budget vs spending data
  const budgetVsSpending = dashboardSummary?.budget_vs_spending || [];

  return (
    <Box>
      {!compact && (
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontSize="xl" fontWeight="bold">Budget Management</Text>
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="primary" 
            onClick={onOpen}
          >
            Add Budget
          </Button>
        </Flex>
      )}
      
      {loading ? (
        <Flex justify="center" align="center" height="100px">
          <Spinner size="lg" color="primary.500" />
        </Flex>
      ) : (
        <SimpleGrid columns={compact ? { base: 1, lg: 2 } : { base: 1, md: 2, lg: 3 }} spacing={4} mt={compact ? 0 : 4}>
          {budgetVsSpending.map((item, index) => (
            <BudgetCard 
              key={index}
              category={item.category}
              amount={item.budget}
              spent={item.spent}
              period="monthly"
            />
          ))}
          
          {/* Show placeholder if no budget data */}
          {budgetVsSpending.length === 0 && !loading && (
            <Box 
              p={4} 
              borderWidth="1px" 
              borderRadius="lg" 
              borderStyle="dashed"
              textAlign="center"
            >
              <Text color="gray.500">No budgets added yet</Text>
              <Button 
                size="sm" 
                colorScheme="primary" 
                variant="outline" 
                mt={2}
                onClick={onOpen}
              >
                Add your first budget
              </Button>
            </Box>
          )}
        </SimpleGrid>
      )}
      
      {/* Add Budget Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Budget Category</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {saveError && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                {saveError}
              </Alert>
            )}
            
            <FormControl mb={4} isInvalid={formErrors.category}>
              <FormLabel>Category</FormLabel>
              <Select 
                name="category" 
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Select category"
                isDisabled={isSubmitting}
              >
                <option value="Housing">Housing</option>
                <option value="Food">Food</option>
                <option value="Transportation">Transportation</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Savings">Savings</option>
                <option value="Debt">Debt Payments</option>
                <option value="Other">Other</option>
              </Select>
              {formErrors.category && <FormErrorMessage>{formErrors.category}</FormErrorMessage>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.amount}>
              <FormLabel>Budget Amount</FormLabel>
              <Input 
                name="amount" 
                type="number" 
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                isDisabled={isSubmitting}
              />
              {formErrors.amount && <FormErrorMessage>{formErrors.amount}</FormErrorMessage>}
            </FormControl>
            
            <FormControl mb={4} isInvalid={formErrors.period}>
              <FormLabel>Period</FormLabel>
              <Select 
                name="period" 
                value={formData.period}
                onChange={handleInputChange}
                isDisabled={isSubmitting}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
              {formErrors.period && <FormErrorMessage>{formErrors.period}</FormErrorMessage>}
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Description (Optional)</FormLabel>
              <Input 
                name="description" 
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional description"
                isDisabled={isSubmitting}
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              leftIcon={<FiSave />} 
              colorScheme="primary" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Saving"
            >
              Save Budget
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Wrap the component with error handling
export default withErrorHandling(BudgetManager, { 
  componentName: 'Budget Manager',
  onError: (error) => console.error('BudgetManager error:', error)
});
