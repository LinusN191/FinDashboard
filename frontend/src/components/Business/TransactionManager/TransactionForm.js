import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Textarea,
  VStack,
  HStack,
  RadioGroup,
  Radio,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiDollarSign } from 'react-icons/fi';
import { useBusiness } from '../../../context/BusinessContext';

const TransactionForm = ({ isOpen, onClose, businessId, transaction, isEditing }) => {
  const toast = useToast();
  const { 
    TRANSACTION_CATEGORIES, 
    addTransaction, 
    updateTransaction 
  } = useBusiness();
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    reference: '',
    notes: '',
    status: 'completed'
  });
  
  // Form validation
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Payment methods
  const paymentMethods = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'Check',
    'PayPal',
    'Mobile Payment',
    'Other'
  ];
  
  // Load transaction data if editing
  useEffect(() => {
    if (isEditing && transaction) {
      // Parse date to YYYY-MM-DD format for the date input
      const dateStr = transaction.date 
        ? new Date(transaction.date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];
      
      setFormData({
        type: transaction.type || 'expense',
        amount: transaction.amount || '',
        currency: transaction.currency || 'USD',
        category: transaction.category || '',
        description: transaction.description || '',
        date: dateStr,
        paymentMethod: transaction.paymentMethod || '',
        reference: transaction.reference || '',
        notes: transaction.notes || '',
        status: transaction.status || 'completed'
      });
    } else {
      // Reset form for new transaction
      setFormData({
        type: 'expense',
        amount: '',
        currency: 'USD',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        reference: '',
        notes: '',
        status: 'completed'
      });
    }
    
    // Clear errors when form opens
    setErrors({});
    setError(null);
  }, [isOpen, transaction, isEditing]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user corrects it
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // Handle radio group changes
  const handleRadioChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update category options if type changes
    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        category: '' // Reset category when type changes
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.description) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = 'Invalid date format';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create date object for consistency
      const dateObj = new Date(formData.date);
      
      // Prepare transaction data
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: dateObj.toISOString()
      };
      
      let result;
      
      if (isEditing) {
        // Update existing transaction
        result = await updateTransaction(
          businessId, 
          transaction.id, 
          transactionData
        );
        
        if (result) {
          toast({
            title: 'Transaction updated',
            description: 'The transaction has been updated successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          onClose();
        } else {
          setError('Failed to update transaction. Please try again.');
        }
      } else {
        // Add new transaction
        result = await addTransaction(businessId, transactionData);
        
        if (result) {
          toast({
            title: 'Transaction added',
            description: 'The new transaction has been added successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          onClose();
        } else {
          setError('Failed to add transaction. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get categories based on transaction type
  const getCategoriesForType = (type) => {
    return TRANSACTION_CATEGORIES[type] || [];
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isEditing ? 'Edit Transaction' : 'Add New Transaction'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <VStack spacing={4} align="stretch">
            {/* Transaction Type */}
            <FormControl isRequired>
              <FormLabel>Transaction Type</FormLabel>
              <RadioGroup 
                value={formData.type} 
                onChange={(value) => handleRadioChange('type', value)}
              >
                <HStack spacing={4}>
                  <Radio value="income" colorScheme="green">Income</Radio>
                  <Radio value="expense" colorScheme="red">Expense</Radio>
                </HStack>
              </RadioGroup>
            </FormControl>
            
            {/* Amount and Currency */}
            <HStack spacing={4} align="flex-start">
              <FormControl isRequired isInvalid={!!errors.amount}>
                <FormLabel>Amount</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FiDollarSign color="gray.300" />
                  </InputLeftElement>
                  <Input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Amount"
                  />
                </InputGroup>
                <FormErrorMessage>{errors.amount}</FormErrorMessage>
              </FormControl>
              
              <FormControl>
                <FormLabel>Currency</FormLabel>
                <Select 
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="KES">KES</option>
                </Select>
              </FormControl>
            </HStack>
            
            {/* Category */}
            <FormControl isRequired isInvalid={!!errors.category}>
              <FormLabel>Category</FormLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Select category"
              >
                {getCategoriesForType(formData.type).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <FormErrorMessage>{errors.category}</FormErrorMessage>
            </FormControl>
            
            {/* Description */}
            <FormControl isRequired isInvalid={!!errors.description}>
              <FormLabel>Description</FormLabel>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description"
              />
              <FormErrorMessage>{errors.description}</FormErrorMessage>
            </FormControl>
            
            {/* Date */}
            <FormControl isRequired isInvalid={!!errors.date}>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
              <FormErrorMessage>{errors.date}</FormErrorMessage>
            </FormControl>
            
            {/* Payment Method */}
            <FormControl>
              <FormLabel>Payment Method</FormLabel>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                placeholder="Select payment method"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </Select>
            </FormControl>
            
            {/* Reference */}
            <FormControl>
              <FormLabel>Reference</FormLabel>
              <Input
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="Invoice #, Receipt #, etc."
              />
            </FormControl>
            
            {/* Notes */}
            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes"
                rows={3}
              />
            </FormControl>
            
            {/* Status */}
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
                <option value="void">Void</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TransactionForm;
