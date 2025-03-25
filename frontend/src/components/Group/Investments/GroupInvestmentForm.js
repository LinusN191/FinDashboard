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
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormErrorMessage,
  Textarea,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useToast
} from '@chakra-ui/react';

const GroupInvestmentForm = ({ 
  isOpen, 
  onClose, 
  onSave, 
  investment = null, 
  availableFunds = 0,
  investmentTypes = [],
  isLoading = false
}) => {
  const toast = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    amount: 0,
    date: '',
    description: '',
    status: 'active',
    returns: 0,
    returnsPercentage: 0
  });
  
  // Form errors
  const [errors, setErrors] = useState({});
  
  // Initialize form with investment data if editing
  useEffect(() => {
    if (investment) {
      setFormData({
        name: investment.name || '',
        type: investment.type || '',
        amount: investment.amount || 0,
        date: investment.date ? new Date(investment.date).toISOString().split('T')[0] : '',
        description: investment.description || '',
        status: investment.status || 'active',
        returns: investment.returns || 0,
        returnsPercentage: investment.returnsPercentage || 0
      });
    } else {
      // Default values for new investment
      setFormData({
        name: '',
        type: investmentTypes.length > 0 ? investmentTypes[0] : '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        status: 'active',
        returns: 0,
        returnsPercentage: 0
      });
    }
  }, [investment, investmentTypes]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    
    // If amount or returns changed, calculate returns percentage
    if (name === 'amount' || name === 'returns') {
      updateReturnsPercentage({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    }
  };
  
  // Handle number input changes
  const handleNumberChange = (name, value) => {
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    
    // If amount or returns changed, calculate returns percentage
    if (name === 'amount' || name === 'returns') {
      updateReturnsPercentage({
        ...formData,
        [name]: numValue
      });
    }
  };
  
  // Update returns percentage when amount or returns change
  const updateReturnsPercentage = (data) => {
    if (data.amount > 0) {
      const percentage = (data.returns / data.amount) * 100;
      setFormData(prev => ({
        ...prev,
        returnsPercentage: parseFloat(percentage.toFixed(2))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        returnsPercentage: 0
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Investment type is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (!investment && formData.amount > availableFunds) {
      newErrors.amount = `Amount exceeds available funds (${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(availableFunds)})`;
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (formData.status !== 'active' && formData.status !== 'closed' && formData.status !== 'pending') {
      newErrors.status = 'Valid status is required';
    }
    
    // Returns can't be negative for active investments
    if (formData.returns < 0 && formData.status === 'active') {
      newErrors.returns = 'Returns cannot be negative for active investments';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {investment ? 'Edit Investment' : 'New Group Investment'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {!investment && (
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              Available funds: {formatCurrency(availableFunds)}
            </Alert>
          )}
          
          <VStack spacing={4}>
            {/* Investment Name */}
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel>Investment Name</FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter investment name"
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>
            
            {/* Investment Type */}
            <FormControl isRequired isInvalid={!!errors.type}>
              <FormLabel>Investment Type</FormLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Select investment type"
              >
                {investmentTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.type}</FormErrorMessage>
            </FormControl>
            
            {/* Amount */}
            <FormControl isRequired isInvalid={!!errors.amount}>
              <FormLabel>Amount</FormLabel>
              <NumberInput
                min={0}
                max={investment ? undefined : availableFunds}
                value={formData.amount}
                onChange={(valueString) => handleNumberChange('amount', valueString)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.amount}</FormErrorMessage>
            </FormControl>
            
            {/* Date */}
            <FormControl isRequired isInvalid={!!errors.date}>
              <FormLabel>Date</FormLabel>
              <Input
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
              />
              <FormErrorMessage>{errors.date}</FormErrorMessage>
            </FormControl>
            
            {/* Description */}
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter investment description"
                rows={3}
              />
            </FormControl>
            
            {/* Status */}
            <FormControl isRequired isInvalid={!!errors.status}>
              <FormLabel>Status</FormLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </Select>
              <FormErrorMessage>{errors.status}</FormErrorMessage>
            </FormControl>
            
            {/* Returns */}
            <FormControl isInvalid={!!errors.returns}>
              <FormLabel>Returns</FormLabel>
              <NumberInput
                value={formData.returns}
                onChange={(valueString) => handleNumberChange('returns', valueString)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.returns}</FormErrorMessage>
            </FormControl>
            
            {/* Returns Percentage (calculated field) */}
            <FormControl>
              <FormLabel>Returns Percentage</FormLabel>
              <Text 
                p={2} 
                bg="gray.100" 
                borderRadius="md"
                fontSize="lg"
                fontWeight={formData.returnsPercentage > 0 ? "medium" : "normal"}
                color={formData.returnsPercentage > 0 ? "green.600" : 
                      formData.returnsPercentage < 0 ? "red.600" : "gray.600"}
              >
                {formData.returnsPercentage > 0 ? '+' : ''}{formData.returnsPercentage}%
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            {investment ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GroupInvestmentForm;
