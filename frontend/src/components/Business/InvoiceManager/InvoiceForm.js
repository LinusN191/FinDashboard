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
  Box,
  Flex,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Divider,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiDollarSign, FiPlus, FiTrash2, FiCalendar } from 'react-icons/fi';
import { useBusiness } from '../../../context/BusinessContext';

const InvoiceForm = ({ isOpen, onClose, businessId, invoice, isEditing }) => {
  const toast = useToast();
  const { createInvoice, updateInvoice } = useBusiness();
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    items: [
      { description: '', quantity: 1, unitPrice: 0, amount: 0 }
    ],
    notes: '',
    subtotal: 0,
    taxRate: 20, // Default tax rate percentage
    tax: 0,
    total: 0,
    status: 'draft',
    currency: 'USD'
  });
  
  // Form validation
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Load invoice data if editing
  useEffect(() => {
    if (isEditing && invoice) {
      // Parse dates to YYYY-MM-DD format
      const issueDateStr = invoice.issueDate 
        ? new Date(invoice.issueDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];
      
      const dueDateStr = invoice.dueDate 
        ? new Date(invoice.dueDate).toISOString().split('T')[0] 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Calculate tax rate from tax and subtotal
      const taxRate = invoice.subtotal > 0 
        ? Math.round((invoice.tax / invoice.subtotal) * 100) 
        : 20;
      
      setFormData({
        customerName: invoice.customerName || '',
        customerEmail: invoice.customerEmail || '',
        customerAddress: invoice.customerAddress || '',
        invoiceNumber: invoice.invoiceNumber || '',
        issueDate: issueDateStr,
        dueDate: dueDateStr,
        items: invoice.items?.length > 0 
          ? invoice.items 
          : [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
        notes: invoice.notes || '',
        subtotal: invoice.subtotal || 0,
        taxRate: taxRate,
        tax: invoice.tax || 0,
        total: invoice.total || 0,
        status: invoice.status || 'draft',
        currency: invoice.currency || 'USD'
      });
    } else {
      // Generate a new invoice number for new invoices
      const currentDate = new Date();
      const invoiceNumber = `INV-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Reset form for new invoice
      setFormData({
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        invoiceNumber: invoiceNumber,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
          { description: '', quantity: 1, unitPrice: 0, amount: 0 }
        ],
        notes: '',
        subtotal: 0,
        taxRate: 20,
        tax: 0,
        total: 0,
        status: 'draft',
        currency: 'USD'
      });
    }
    
    // Clear errors when form opens
    setErrors({});
    setError(null);
  }, [isOpen, invoice, isEditing]);
  
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
  
  // Handle item field changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    // Parse numeric values
    if (field === 'quantity' || field === 'unitPrice') {
      value = value === '' ? 0 : parseFloat(value);
    }
    
    // Update the specific field
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Recalculate amount
    updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unitPrice;
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Recalculate totals
    calculateTotals(updatedItems);
  };
  
  // Add new item
  const addItem = () => {
    const newItem = { description: '', quantity: 1, unitPrice: 0, amount: 0 };
    const updatedItems = [...formData.items, newItem];
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };
  
  // Remove item
  const removeItem = (index) => {
    if (formData.items.length <= 1) {
      return; // Keep at least one item
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Recalculate totals
    calculateTotals(updatedItems);
  };
  
  // Calculate subtotal, tax, and total
  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const tax = (subtotal * formData.taxRate) / 100;
    const total = subtotal + tax;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  };
  
  // Handle tax rate change
  const handleTaxRateChange = (e) => {
    const taxRate = parseFloat(e.target.value) || 0;
    const subtotal = formData.subtotal;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;
    
    setFormData(prev => ({
      ...prev,
      taxRate,
      tax,
      total
    }));
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.customerName) {
      newErrors.customerName = 'Customer name is required';
    }
    
    if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }
    
    if (!formData.invoiceNumber) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }
    
    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else if (new Date(formData.dueDate) < new Date(formData.issueDate)) {
      newErrors.dueDate = 'Due date cannot be before issue date';
    }
    
    // Validate items
    const itemErrors = [];
    let hasItemErrors = false;
    
    formData.items.forEach((item, index) => {
      const itemError = {};
      
      if (!item.description) {
        itemError.description = 'Description is required';
        hasItemErrors = true;
      }
      
      if (item.quantity <= 0) {
        itemError.quantity = 'Quantity must be greater than zero';
        hasItemErrors = true;
      }
      
      itemErrors[index] = itemError;
    });
    
    if (hasItemErrors) {
      newErrors.items = itemErrors;
    }
    
    // Validate totals
    if (formData.total <= 0) {
      newErrors.total = 'Invoice total must be greater than zero';
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
      // Prepare dates as ISO strings
      const issueDateObj = new Date(formData.issueDate);
      const dueDateObj = new Date(formData.dueDate);
      
      // Prepare invoice data
      const invoiceData = {
        ...formData,
        issueDate: issueDateObj.toISOString(),
        dueDate: dueDateObj.toISOString()
      };
      
      let result;
      
      if (isEditing) {
        // Update existing invoice
        result = await updateInvoice(
          businessId, 
          invoice.id, 
          invoiceData
        );
        
        if (result) {
          toast({
            title: 'Invoice updated',
            description: 'The invoice has been updated successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          onClose();
        } else {
          setError('Failed to update invoice. Please try again.');
        }
      } else {
        // Create new invoice
        result = await createInvoice(businessId, invoiceData);
        
        if (result) {
          toast({
            title: 'Invoice created',
            description: 'The new invoice has been created successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          onClose();
        } else {
          setError('Failed to create invoice. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // UI Colors
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <VStack spacing={6} align="stretch">
            {/* Customer Information */}
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={3}>
                Customer Information
              </Text>
              <HStack spacing={4} align="flex-start">
                <FormControl isRequired isInvalid={!!errors.customerName}>
                  <FormLabel>Customer/Business Name</FormLabel>
                  <Input
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="Customer or business name"
                  />
                  <FormErrorMessage>{errors.customerName}</FormErrorMessage>
                </FormControl>
                
                <FormControl isInvalid={!!errors.customerEmail}>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    placeholder="customer@example.com"
                  />
                  <FormErrorMessage>{errors.customerEmail}</FormErrorMessage>
                </FormControl>
              </HStack>
              
              <FormControl mt={4}>
                <FormLabel>Address</FormLabel>
                <Textarea
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleChange}
                  placeholder="Customer address"
                  rows={2}
                />
              </FormControl>
            </Box>
            
            <Divider />
            
            {/* Invoice Details */}
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={3}>
                Invoice Details
              </Text>
              
              <HStack spacing={4} align="flex-start">
                <FormControl isRequired isInvalid={!!errors.invoiceNumber}>
                  <FormLabel>Invoice Number</FormLabel>
                  <Input
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleChange}
                    placeholder="INV-2025-001"
                  />
                  <FormErrorMessage>{errors.invoiceNumber}</FormErrorMessage>
                </FormControl>
                
                <FormControl isRequired isInvalid={!!errors.issueDate}>
                  <FormLabel>Issue Date</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <FiCalendar color="gray.300" />
                    </InputLeftElement>
                    <Input
                      type="date"
                      name="issueDate"
                      value={formData.issueDate}
                      onChange={handleChange}
                    />
                  </InputGroup>
                  <FormErrorMessage>{errors.issueDate}</FormErrorMessage>
                </FormControl>
                
                <FormControl isRequired isInvalid={!!errors.dueDate}>
                  <FormLabel>Due Date</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <FiCalendar color="gray.300" />
                    </InputLeftElement>
                    <Input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                    />
                  </InputGroup>
                  <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
                </FormControl>
              </HStack>
              
              <HStack spacing={4} align="flex-start" mt={4}>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Select 
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="KES">KES - Kenyan Shilling</option>
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="canceled">Canceled</option>
                  </Select>
                </FormControl>
              </HStack>
            </Box>
            
            <Divider />
            
            {/* Invoice Items */}
            <Box>
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontSize="lg" fontWeight="medium">
                  Invoice Items
                </Text>
                <Button 
                  leftIcon={<FiPlus />} 
                  size="sm" 
                  colorScheme="blue"
                  onClick={addItem}
                >
                  Add Item
                </Button>
              </Flex>
              
              <Box overflowX="auto">
                <Table variant="simple" size="sm" mb={4}>
                  <Thead>
                    <Tr>
                      <Th>Description</Th>
                      <Th isNumeric>Quantity</Th>
                      <Th isNumeric>Unit Price</Th>
                      <Th isNumeric>Amount</Th>
                      <Th width="50px"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {formData.items.map((item, index) => (
                      <Tr key={index}>
                        <Td>
                          <Input
                            size="sm"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Item description"
                            isInvalid={errors.items && errors.items[index]?.description}
                          />
                        </Td>
                        <Td isNumeric>
                          <Input
                            size="sm"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            isInvalid={errors.items && errors.items[index]?.quantity}
                            min="1"
                            step="1"
                          />
                        </Td>
                        <Td isNumeric>
                          <InputGroup size="sm">
                            <InputLeftElement pointerEvents="none">
                              <FiDollarSign color="gray.300" />
                            </InputLeftElement>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              step="0.01"
                              min="0"
                            />
                          </InputGroup>
                        </Td>
                        <Td isNumeric>
                          {formatCurrency(item.amount)}
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="Remove item"
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => removeItem(index)}
                            isDisabled={formData.items.length <= 1}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
              
              {/* Totals */}
              <Box 
                borderTopWidth="1px" 
                borderColor={borderColor} 
                pt={4}
              >
                <Flex justify="flex-end">
                  <Box width={{ base: "100%", md: "40%" }}>
                    <Flex justify="space-between" mb={2}>
                      <Text>Subtotal:</Text>
                      <Text>{formatCurrency(formData.subtotal)}</Text>
                    </Flex>
                    
                    <Flex justify="space-between" align="center" mb={2}>
                      <Flex align="center">
                        <Text mr={2}>Tax Rate:</Text>
                        <Input
                          size="xs"
                          width="60px"
                          type="number"
                          value={formData.taxRate}
                          onChange={handleTaxRateChange}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <Text ml={1}>%</Text>
                      </Flex>
                      <Text>{formatCurrency(formData.tax)}</Text>
                    </Flex>
                    
                    <Flex 
                      justify="space-between" 
                      fontWeight="bold" 
                      fontSize="lg"
                      mt={4}
                      pt={2}
                      borderTopWidth="1px"
                      borderColor={borderColor}
                    >
                      <Text>Total:</Text>
                      <Text color={formData.total <= 0 && errors.total ? "red.500" : undefined}>
                        {formatCurrency(formData.total)}
                      </Text>
                    </Flex>
                    {errors.total && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {errors.total}
                      </Text>
                    )}
                  </Box>
                </Flex>
              </Box>
            </Box>
            
            {/* Notes */}
            <Box>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Payment terms, delivery information, or any other notes"
                  rows={3}
                />
              </FormControl>
            </Box>
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
            {isEditing ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InvoiceForm;
