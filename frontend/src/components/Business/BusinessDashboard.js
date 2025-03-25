import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Button,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  useDisclosure,
  useToast,
  Radio,
  RadioGroup,
  Stack,
  FormErrorMessage
} from '@chakra-ui/react';
import { FiPlus, FiFileText, FiDollarSign, FiBarChart2, FiSave, FiArrowLeft } from 'react-icons/fi';
import { useBusiness } from '../../context/BusinessContext';
import TransactionList from './TransactionManager/TransactionList';
import InvoiceList from './InvoiceManager/InvoiceList';
import ProfitLossReport from './Reports/ProfitLossReport';
import ErrorWrapper from '../ErrorWrapper';

const BusinessDashboard = () => {
  const { 
    businesses,
    currentBusiness,
    setCurrentBusiness,
    businessTransactions,
    businessInvoices,
    loadBusinessData,
    calculateFinancialSummary,
    loading,
    fetchBusinesses,
    createBusiness,
    addTransaction
  } = useBusiness();
  
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashFlow: 0,
    outstandingInvoices: 0
  });

  // Modal states
  const newBusinessModal = useDisclosure();
  const newTransactionModal = useDisclosure();
  const toast = useToast();

  // Form states
  const [newBusinessData, setNewBusinessData] = useState({
    name: '',
    industry: '',
    type: 'LLC',
    foundedDate: ''
  });

  const [newTransactionData, setNewTransactionData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense',
    category: 'general',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load businesses on mount
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);
  
  // Load business data when business changes
  useEffect(() => {
    if (currentBusiness?.id) {
      loadBusinessData(currentBusiness.id);
    }
  }, [currentBusiness?.id, loadBusinessData]);
  
  // Calculate financial summary when data changes
  useEffect(() => {
    if (!loading && businessTransactions && businessInvoices) {
      const summary = calculateFinancialSummary(businessTransactions, businessInvoices);
      setFinancialSummary(summary);
    }
  }, [businessTransactions, businessInvoices, loading, calculateFinancialSummary]);
  
  // Handle business change
  const handleBusinessChange = (e) => {
    const businessId = e.target.value;
    const selected = businesses.find(b => b.id === businessId) || null;
    setCurrentBusiness(selected);
  };

  // Handle new business form change
  const handleBusinessFormChange = (e) => {
    const { name, value } = e.target;
    setNewBusinessData({
      ...newBusinessData,
      [name]: value
    });
  };

  // Handle new transaction form change
  const handleTransactionFormChange = (e) => {
    const { name, value } = e.target;
    setNewTransactionData({
      ...newTransactionData,
      [name]: value
    });
  };

  // Handle radio input change for transaction type
  const handleTransactionTypeChange = (value) => {
    setNewTransactionData({
      ...newTransactionData,
      type: value
    });
  };

  // Validate business form
  const validateBusinessForm = () => {
    const errors = {};
    if (!newBusinessData.name.trim()) {
      errors.name = "Business name is required";
    }
    if (!newBusinessData.industry.trim()) {
      errors.industry = "Industry is required";
    }
    if (!newBusinessData.foundedDate) {
      errors.foundedDate = "Founded date is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate transaction form
  const validateTransactionForm = () => {
    const errors = {};
    if (!newTransactionData.description.trim()) {
      errors.description = "Description is required";
    }
    if (!newTransactionData.amount || isNaN(newTransactionData.amount) || Number(newTransactionData.amount) <= 0) {
      errors.amount = "Valid amount is required";
    }
    if (!newTransactionData.date) {
      errors.date = "Date is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit new business
  const handleSubmitBusiness = async () => {
    if (!validateBusinessForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createBusiness(newBusinessData);
      
      if (result) {
        newBusinessModal.onClose();
        setNewBusinessData({
          name: '',
          industry: '',
          type: 'LLC',
          foundedDate: ''
        });
        
        toast({
          title: "Business created",
          description: `${newBusinessData.name} has been created successfully.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create business. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error creating business:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit new transaction
  const handleSubmitTransaction = async () => {
    if (!validateTransactionForm()) {
      return;
    }

    if (!currentBusiness) {
      toast({
        title: "Error",
        description: "No business selected. Please select a business first.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await addTransaction(currentBusiness.id, newTransactionData);
      
      if (result) {
        newTransactionModal.onClose();
        setNewTransactionData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          type: 'expense',
          category: 'general',
          notes: ''
        });
        
        toast({
          title: "Transaction added",
          description: "Your transaction has been recorded successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error adding transaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const headerBgColor = useColorModeValue('gray.50', 'gray.800');
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Error state for component
  const [error, setError] = useState(null);

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      console.error("Error in BusinessDashboard:", error);
    }
  }, [error]);

  // Error handler function
  const handleError = (err, action) => {
    console.error(`Error ${action}:`, err);
    setError(err);
  };

  // Reset error state
  const resetError = () => setError(null);

  // If loading, show spinner
  if (loading && !currentBusiness) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" mb={4} />
        <Text>Loading businesses...</Text>
      </Box>
    );
  }
  
  return (
    <ErrorWrapper error={error} onRetry={resetError} componentName="BusinessDashboard">
      <Box maxW="7xl" mx="auto" px={{ base: '4', md: '8', lg: '12' }} py={{ base: '6', md: '8', lg: '12' }}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg">Business Finance Management</Heading>
            <Text color="gray.500">Manage your business finances, expenses and revenues</Text>
          </Box>
          <Flex gap={3}>
            <Button 
              as="a" 
              href="/" 
              colorScheme="gray" 
              variant="outline"
              leftIcon={<FiArrowLeft />}
            >
              Home
            </Button>
            <Button 
              colorScheme="blue" 
              leftIcon={<FiPlus />} 
              onClick={newBusinessModal.onOpen}
            >
              New Business
            </Button>
          </Flex>
        </Flex>
        <Flex direction="column" mb={6}>
          {/* Business Selector */}
          <Box mb={6}>
            <Text mb={2} fontWeight="medium">Select Business:</Text>
            <Flex>
              <Select 
                value={currentBusiness?.id || ''} 
                onChange={handleBusinessChange}
                maxW="400px"
                mr={4}
              >
                <option value="">Select a business</option>
                {businesses.map(business => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </Select>
              <Button 
                colorScheme="blue" 
                leftIcon={<FiPlus />}
                onClick={newBusinessModal.onOpen}
              >
                New Business
              </Button>
            </Flex>
          </Box>
          
          {!currentBusiness ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              Please select a business to view its dashboard
            </Alert>
          ) : (
            <>
              <Flex justify="space-between" align="center" mb={6}>
                <Box>
                  <Heading as="h2" size="lg" mb={2}>{currentBusiness.name}</Heading>
                  <Text color="gray.500">{currentBusiness.industry} | {currentBusiness.type}</Text>
                </Box>
                <Button 
                  leftIcon={<FiPlus />} 
                  colorScheme="blue"
                  onClick={newTransactionModal.onOpen}
                >
                  Add Transaction
                </Button>
              </Flex>
              
              {/* Financial Summary Cards */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4} mb={8}>
                <Stat
                  p={4}
                  bg={bgColor}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <StatLabel>Revenue</StatLabel>
                  <StatNumber>{formatCurrency(financialSummary.totalRevenue)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    23.36%
                  </StatHelpText>
                </Stat>
                
                <Stat
                  p={4}
                  bg={bgColor}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <StatLabel>Expenses</StatLabel>
                  <StatNumber>{formatCurrency(financialSummary.totalExpenses)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="decrease" />
                    5.05%
                  </StatHelpText>
                </Stat>
                
                <Stat
                  p={4}
                  bg={bgColor}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <StatLabel>Net Profit</StatLabel>
                  <StatNumber>{formatCurrency(financialSummary.netProfit)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    42.9%
                  </StatHelpText>
                </Stat>
                
                <Stat
                  p={4}
                  bg={bgColor}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <StatLabel>Cash Flow</StatLabel>
                  <StatNumber>{formatCurrency(financialSummary.cashFlow)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    18.2%
                  </StatHelpText>
                </Stat>
                
                <Stat
                  p={4}
                  bg={bgColor}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  boxShadow="sm"
                >
                  <StatLabel>Outstanding</StatLabel>
                  <StatNumber>{formatCurrency(financialSummary.outstandingInvoices)}</StatNumber>
                  <StatHelpText>
                    {financialSummary.outstandingInvoices > financialSummary.prevOutstandingInvoices ? (
                      <>
                        <StatArrow type="increase" />
                        {((financialSummary.outstandingInvoices / financialSummary.prevOutstandingInvoices - 1) * 100).toFixed(2)}%
                      </>
                    ) : (
                      <>
                        <StatArrow type="decrease" />
                        {((1 - financialSummary.outstandingInvoices / financialSummary.prevOutstandingInvoices) * 100).toFixed(2)}%
                      </>
                    )}
                  </StatHelpText>
                </Stat>
              </SimpleGrid>
              
              {/* Main Tabs */}
              <Tabs variant="enclosed" colorScheme="blue">
                <TabList>
                  <Tab>Transactions</Tab>
                  <Tab>Invoices</Tab>
                  <Tab>Reports</Tab>
                </TabList>
                
                <TabPanels>
                  <TabPanel p={0} pt={4}>
                    <ErrorWrapper componentName="Transaction List">
                      <TransactionList 
                        transactions={businessTransactions} 
                        onAddTransaction={newTransactionModal.onOpen}
                      />
                    </ErrorWrapper>
                  </TabPanel>
                  
                  <TabPanel p={0} pt={4}>
                    <ErrorWrapper componentName="Invoice List">
                      <InvoiceList invoices={businessInvoices} />
                    </ErrorWrapper>
                  </TabPanel>
                  
                  <TabPanel p={0} pt={4}>
                    <ErrorWrapper componentName="Financial Reports">
                      <ProfitLossReport 
                        transactions={businessTransactions} 
                      />
                    </ErrorWrapper>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </Flex>

        {/* New Business Modal */}
        <Modal isOpen={newBusinessModal.isOpen} onClose={newBusinessModal.onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Business</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl isRequired isInvalid={!!formErrors.name} mb={4}>
                <FormLabel>Business Name</FormLabel>
                <Input 
                  name="name"
                  value={newBusinessData.name}
                  onChange={handleBusinessFormChange}
                  placeholder="Enter business name"
                />
                {formErrors.name && <FormErrorMessage>{formErrors.name}</FormErrorMessage>}
              </FormControl>

              <FormControl isRequired isInvalid={!!formErrors.industry} mb={4}>
                <FormLabel>Industry</FormLabel>
                <Input 
                  name="industry"
                  value={newBusinessData.industry}
                  onChange={handleBusinessFormChange}
                  placeholder="Enter industry"
                />
                {formErrors.industry && <FormErrorMessage>{formErrors.industry}</FormErrorMessage>}
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Business Type</FormLabel>
                <Select 
                  name="type"
                  value={newBusinessData.type}
                  onChange={handleBusinessFormChange}
                >
                  <option value="LLC">LLC</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired isInvalid={!!formErrors.foundedDate} mb={4}>
                <FormLabel>Founded Date</FormLabel>
                <Input 
                  name="foundedDate"
                  type="date"
                  value={newBusinessData.foundedDate}
                  onChange={handleBusinessFormChange}
                />
                {formErrors.foundedDate && <FormErrorMessage>{formErrors.foundedDate}</FormErrorMessage>}
              </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={newBusinessModal.onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                leftIcon={<FiSave />} 
                onClick={handleSubmitBusiness}
                isLoading={isSubmitting}
              >
                Create Business
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* New Transaction Modal */}
        <Modal isOpen={newTransactionModal.isOpen} onClose={newTransactionModal.onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add New Transaction</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl isRequired isInvalid={!!formErrors.date} mb={4}>
                <FormLabel>Date</FormLabel>
                <Input 
                  name="date"
                  type="date"
                  value={newTransactionData.date}
                  onChange={handleTransactionFormChange}
                />
                {formErrors.date && <FormErrorMessage>{formErrors.date}</FormErrorMessage>}
              </FormControl>

              <FormControl isRequired isInvalid={!!formErrors.description} mb={4}>
                <FormLabel>Description</FormLabel>
                <Input 
                  name="description"
                  value={newTransactionData.description}
                  onChange={handleTransactionFormChange}
                  placeholder="Enter transaction description"
                />
                {formErrors.description && <FormErrorMessage>{formErrors.description}</FormErrorMessage>}
              </FormControl>

              <FormControl isRequired isInvalid={!!formErrors.amount} mb={4}>
                <FormLabel>Amount</FormLabel>
                <NumberInput min={0}>
                  <NumberInputField 
                    name="amount"
                    value={newTransactionData.amount}
                    onChange={(value) => handleTransactionFormChange({
                      target: { name: 'amount', value }
                    })}
                    placeholder="0.00"
                  />
                </NumberInput>
                {formErrors.amount && <FormErrorMessage>{formErrors.amount}</FormErrorMessage>}
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Type</FormLabel>
                <RadioGroup 
                  name="type"
                  value={newTransactionData.type}
                  onChange={handleTransactionTypeChange}
                >
                  <Stack direction="row">
                    <Radio value="income">Income</Radio>
                    <Radio value="expense">Expense</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Category</FormLabel>
                <Select 
                  name="category"
                  value={newTransactionData.category}
                  onChange={handleTransactionFormChange}
                >
                  {newTransactionData.type === 'income' ? (
                    <>
                      <option value="sales">Sales</option>
                      <option value="services">Services</option>
                      <option value="investment">Investment</option>
                      <option value="other">Other Income</option>
                    </>
                  ) : (
                    <>
                      <option value="general">General</option>
                      <option value="office">Office Supplies</option>
                      <option value="utilities">Utilities</option>
                      <option value="rent">Rent</option>
                      <option value="payroll">Payroll</option>
                      <option value="marketing">Marketing</option>
                      <option value="travel">Travel</option>
                      <option value="software">Software & Subscriptions</option>
                      <option value="other">Other Expense</option>
                    </>
                  )}
                </Select>
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Notes</FormLabel>
                <Textarea 
                  name="notes"
                  value={newTransactionData.notes}
                  onChange={handleTransactionFormChange}
                  placeholder="Enter additional notes (optional)"
                />
              </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={newTransactionModal.onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                leftIcon={<FiSave />} 
                onClick={handleSubmitTransaction}
                isLoading={isSubmitting}
              >
                Save Transaction
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </ErrorWrapper>
  );
};

export default BusinessDashboard;
