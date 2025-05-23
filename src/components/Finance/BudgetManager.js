import React, { useState } from 'react';
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
  useToast, // Added
  Spinner,  // Added
  Alert,    // Added
  AlertIcon // Added
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';

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

const BudgetManager = () => {
  const { dashboardSummary, createBudget, loading, error } = useFinance(); // Removed 'budgets', added 'error'
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast(); // Added
  const [isSubmitting, setIsSubmitting] = useState(false); // Added for form submission
  
  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
    description: ''
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    });
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true); // Added
    try {
      await createBudget(formData);
      toast({ // Added
        title: 'Budget Created',
        description: 'Your new budget category has been added.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
      // Reset form
      setFormData({
        category: '',
        amount: '',
        period: 'monthly',
        description: ''
      });
    } catch (err) { // Changed error to err
      toast({ // Added
        title: 'Error Creating Budget',
        description: err.message || 'Could not save the budget. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Error creating budget:', err); // Changed error to err
    } finally {
      setIsSubmitting(false); // Added
    }
  };
  
  // Get budget vs spending data
  const budgetVsSpending = dashboardSummary?.budget_vs_spending || [];
  
  return (
    <Box>
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
      
      {/* Loading State */}
      {loading && budgetVsSpending.length === 0 && (
        <Flex justify="center" align="center" minHeight="200px" mt={4}>
          <Spinner size="xl" />
          <Text ml={4}>Loading budgets...</Text>
        </Flex>
      )}

      {/* Error State */}
      {error && budgetVsSpending.length === 0 && (
        <Alert status="error" borderRadius="md" mt={4} mb={4}>
          <AlertIcon />
          There was an error loading your budget data: {error.message || JSON.stringify(error)}
        </Alert>
      )}

      {/* No Budgets Placeholder - shown if not loading, no error, and no budgets */}
      {!loading && !error && budgetVsSpending.length === 0 && (
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          borderStyle="dashed"
          textAlign="center"
          mt={4} // Add margin if it's the only thing shown
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
      
      {/* Add Budget Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Budget Category</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
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
                <option value="Savings">Savings</option>
                <option value="Debt">Debt Payments</option>
                <option value="Other">Other</option>
              </Select>
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Budget Amount</FormLabel>
              <Input 
                name="amount" 
                type="number" 
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Period</FormLabel>
              <Select 
                name="period" 
                value={formData.period}
                onChange={handleInputChange}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Description (Optional)</FormLabel>
              <Input 
                name="description" 
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Budget description"
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
              isLoading={isSubmitting} // Changed to isSubmitting
              isDisabled={!formData.category || !formData.amount}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default BudgetManager;
