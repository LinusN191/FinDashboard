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
  VStack,
  useToast
} from '@chakra-ui/react';

const ContributionForm = ({ 
  isOpen, 
  onClose, 
  onSave, 
  contribution = null, 
  members = [],
  isLoading = false
}) => {
  const toast = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    amount: 0,
    date: '',
    paymentMethod: '',
    status: 'pending'
  });
  
  // Form errors
  const [errors, setErrors] = useState({});
  
  // Initialize form with contribution data if editing
  useEffect(() => {
    if (contribution) {
      setFormData({
        userId: contribution.userId || '',
        amount: contribution.amount || 0,
        date: contribution.date ? new Date(contribution.date).toISOString().split('T')[0] : '',
        paymentMethod: contribution.paymentMethod || '',
        status: contribution.status || 'pending'
      });
    } else {
      // Default values for new contribution
      setFormData({
        userId: members.length > 0 ? members[0].id : '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        status: 'pending'
      });
    }
  }, [contribution, members]);
  
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
  };
  
  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.userId) {
      newErrors.userId = 'Member is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    if (!formData.status) {
      newErrors.status = 'Status is required';
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
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {contribution ? 'Edit Contribution' : 'Add New Contribution'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4}>
            {/* Member Selection */}
            <FormControl isRequired isInvalid={!!errors.userId}>
              <FormLabel>Member</FormLabel>
              <Select
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                placeholder="Select member"
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.userId}</FormErrorMessage>
            </FormControl>
            
            {/* Amount */}
            <FormControl isRequired isInvalid={!!errors.amount}>
              <FormLabel>Amount</FormLabel>
              <NumberInput
                min={0}
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
            
            {/* Payment Method */}
            <FormControl isRequired isInvalid={!!errors.paymentMethod}>
              <FormLabel>Payment Method</FormLabel>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                placeholder="Select payment method"
              >
                <option value="bank transfer">Bank Transfer</option>
                <option value="credit card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="mobile payment">Mobile Payment</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </Select>
              <FormErrorMessage>{errors.paymentMethod}</FormErrorMessage>
            </FormControl>
            
            {/* Status */}
            <FormControl isRequired isInvalid={!!errors.status}>
              <FormLabel>Status</FormLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </Select>
              <FormErrorMessage>{errors.status}</FormErrorMessage>
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
            {contribution ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ContributionForm;
