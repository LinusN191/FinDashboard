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
  IconButton,
  useDisclosure,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  VStack,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  Tooltip,
  Spinner
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiTrash2, FiAlertCircle, FiCheckCircle, FiDollarSign, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import { useInvestment } from '../../context/InvestmentContext';
import { useError } from '../../context/ErrorContext';
import AssetSelector from './AssetSelector';
import withErrorHandling from '../withErrorHandling';

const InvestmentManager = () => {
  const { 
    loading, 
    error: contextError,
    currentAsset,
    fetchAssetData,
    searchResults,
    performanceMetrics,
    searchAssets,
    addInvestment,
    removeInvestment,
    userInvestments,
    fetchUserInvestments
  } = useInvestment();
  
  const { registerError, clearError } = useError();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [investments, setInvestments] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    shares: 1,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    type: 'stock'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState(null);
  
  const toast = useToast();
  
  // Clear errors on mount and unmount
  useEffect(() => {
    clearError('investment-manager');
    
    return () => {
      clearError('investment-manager');
    };
  }, [clearError]);
  
  // Load data
  useEffect(() => {
    const loadInvestments = async () => {
      try {
        setLoadError(null);
        
        // If we have user investments from context, use those
        if (userInvestments && userInvestments.length > 0) {
          setInvestments(userInvestments);
        } else if (fetchUserInvestments) {
          // Otherwise try to fetch them
          await fetchUserInvestments();
        }
      } catch (err) {
        console.error('Failed to load investments:', err);
        setLoadError('Failed to load investment data. Please try again.');
        registerError('investment-manager', { message: 'Failed to load investments' });
      }
    };
    
    loadInvestments();
  }, [userInvestments, fetchUserInvestments, registerError]);
  
  // Handle asset search
  const handleSearch = async (query) => {
    try {
      setSearchQuery(query);
      if (query.length > 1) {
        if (searchAssets) {
          await searchAssets(query);
        }
      }
    } catch (err) {
      console.error('Failed to search assets:', err);
      toast({
        title: "Search Error",
        description: "Failed to search for assets. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  // Handle asset selection from the search component
  const handleAssetSelect = async (ticker, name) => {
    setSelectedAsset({ ticker, name });
    
    setFormData({
      ...formData,
      ticker,
      name
    });
    
    // Clear ticker error if it exists
    if (formErrors.ticker) {
      setFormErrors({
        ...formErrors,
        ticker: null
      });
    }
    
    try {
      // Fetch current price and details
      const assetInfo = await fetchAssetData(ticker);
      if (assetInfo && assetInfo.price_data && assetInfo.price_data.length > 0) {
        const latestPrice = assetInfo.price_data[assetInfo.price_data.length - 1].close;
        setFormData(prev => ({
          ...prev,
          price: latestPrice
        }));
      }
    } catch (err) {
      console.error("Error fetching asset data:", err);
      toast({
        title: "Error fetching price",
        description: "Couldn't retrieve latest price. You can enter it manually.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle shares input
  const handleSharesChange = (valueString) => {
    const shares = parseFloat(valueString) || 0;
    
    // Clear shares error if it exists
    if (formErrors.shares) {
      setFormErrors({
        ...formErrors,
        shares: null
      });
    }
    
    setFormData({
      ...formData,
      shares
    });
  };
  
  // Handle price input
  const handlePriceChange = (valueString) => {
    const price = parseFloat(valueString) || 0;
    
    // Clear price error if it exists
    if (formErrors.price) {
      setFormErrors({
        ...formErrors,
        price: null
      });
    }
    
    setFormData({
      ...formData,
      price
    });
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.ticker) {
      errors.ticker = "Please select a valid asset";
    }
    
    if (!formData.name) {
      errors.name = "Asset name is required";
    }
    
    if (!formData.shares || formData.shares <= 0) {
      errors.shares = "Please enter a valid number of shares";
    }
    
    if (!formData.price || formData.price <= 0) {
      errors.price = "Please enter a valid purchase price";
    }
    
    if (!formData.date) {
      errors.date = "Purchase date is required";
    } else {
      // Validate date is not in the future
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        errors.date = "Purchase date cannot be in the future";
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
    
    setIsSubmitting(true);
    
    try {
      // Create new investment
      const newInvestment = {
        id: `inv-${Date.now()}`,
        ...formData,
        date: formData.date || new Date().toISOString().split('T')[0],
        current_price: formData.price,
        change_percent: 0
      };
      
      // Add to list locally
      const updatedInvestments = [...investments, newInvestment];
      setInvestments(updatedInvestments);
      
      // If we have an API function to add investments, call it
      if (addInvestment) {
        await addInvestment(newInvestment);
      }
      
      toast({
        title: "Investment added",
        description: `Added ${formData.shares} shares of ${formData.name} (${formData.ticker})`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setFormData({
        ticker: '',
        name: '',
        shares: 1,
        price: 0,
        date: new Date().toISOString().split('T')[0],
        type: 'stock'
      });
      
      setSelectedAsset(null);
      onClose();
    } catch (error) {
      console.error("Error adding investment:", error);
      toast({
        title: "Error adding investment",
        description: error.message || "An unexpected error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle investment deletion
  const handleDelete = async (id) => {
    try {
      // Update local state first for responsive UI
      setInvestments(investments.filter(inv => inv.id !== id));
      
      // If we have an API function to remove investments, call it
      if (removeInvestment) {
        await removeInvestment(id);
      }
      
      toast({
        title: "Investment removed",
        description: "The investment has been successfully removed",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting investment:", error);
      toast({
        title: "Error removing investment",
        description: error.message || "An unexpected error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      // Refetch investments to restore correct state
      if (fetchUserInvestments) {
        fetchUserInvestments();
      }
    }
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Calculate total value of an investment
  const calculateTotalValue = (investment) => {
    return investment.shares * (investment.current_price || investment.price);
  };
  
  // Calculate change in value
  const calculateChange = (investment) => {
    const originalValue = investment.shares * investment.price;
    const currentValue = investment.shares * (investment.current_price || investment.price);
    return currentValue - originalValue;
  };
  
  // Calculate total portfolio value
  const calculatePortfolioValue = () => {
    return investments.reduce((total, inv) => {
      return total + calculateTotalValue(inv);
    }, 0);
  };
  
  // Calculate overall portfolio return
  const calculatePortfolioReturn = () => {
    const totalOriginalValue = investments.reduce((total, inv) => {
      return total + (inv.shares * inv.price);
    }, 0);
    
    const totalCurrentValue = calculatePortfolioValue();
    
    if (totalOriginalValue === 0) return 0;
    return ((totalCurrentValue - totalOriginalValue) / totalOriginalValue) * 100;
  };
  
  // Colors
  const tableBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');
  
  // Render error state if context has error
  if (contextError || loadError) {
    return (
      <Box p={4}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <Text fontWeight="bold">Error Loading Investments</Text>
            <Text fontSize="sm">{contextError?.message || loadError || "An unexpected error occurred"}</Text>
          </Box>
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            onClick={() => {
              clearError('investment-manager');
              setLoadError(null);
              if (fetchUserInvestments) fetchUserInvestments();
            }}
          >
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Heading size="lg" mb={1}>Investment Portfolio</Heading>
          <Text color="gray.500">Track your investments and monitor performance</Text>
        </Box>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary"
          onClick={onOpen}
        >
          Add Investment
        </Button>
      </Flex>
      
      {/* Portfolio Summary */}
      <Box 
        mb={6} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg" 
        borderColor={borderColor}
        bg={tableBg}
      >
        <Flex justifyContent="space-between" flexWrap="wrap">
          <Box mb={2} minW="150px">
            <Text color="gray.500" fontSize="sm">Total Value</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {formatCurrency(calculatePortfolioValue())}
            </Text>
          </Box>
          
          <Box mb={2} minW="150px">
            <Text color="gray.500" fontSize="sm">Total Return</Text>
            <Flex alignItems="center">
              <Text 
                fontSize="2xl" 
                fontWeight="bold"
                color={calculatePortfolioReturn() >= 0 ? 'green.500' : 'red.500'}
              >
                {calculatePortfolioReturn().toFixed(2)}%
              </Text>
              {calculatePortfolioReturn() >= 0 ? 
                <FiCheckCircle size={20} color="green" style={{ marginLeft: '8px' }} /> : 
                <FiAlertCircle size={20} color="red" style={{ marginLeft: '8px' }} />
              }
            </Flex>
          </Box>
          
          <Box mb={2} minW="150px">
            <Text color="gray.500" fontSize="sm">Assets</Text>
            <Text fontSize="2xl" fontWeight="bold">{investments.length}</Text>
          </Box>
        </Flex>
      </Box>
      
      {/* Investments Table */}
      {investments.length > 0 ? (
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          borderColor={borderColor}
          overflow="hidden"
        >
          <Table variant="simple">
            <Thead bg={headerBg}>
              <Tr>
                <Th>Asset</Th>
                <Th isNumeric>Shares</Th>
                <Th isNumeric>Purchase Price</Th>
                <Th isNumeric>Current Price</Th>
                <Th isNumeric>Total Value</Th>
                <Th isNumeric>Return</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {investments.map((investment) => (
                <Tr 
                  key={investment.id}
                  _hover={{ bg: hoverBg }}
                  transition="background 0.2s"
                >
                  <Td>
                    <Box>
                      <HStack>
                        <Text fontWeight="bold">{investment.ticker}</Text>
                        <Badge colorScheme={investment.type === 'stock' ? 'blue' : 'purple'}>
                          {investment.type}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">{investment.name}</Text>
                      <Flex alignItems="center" mt={1} fontSize="xs" color="gray.500">
                        <FiCalendar size={12} style={{ marginRight: '4px' }} />
                        <Text>{new Date(investment.date).toLocaleDateString()}</Text>
                      </Flex>
                    </Box>
                  </Td>
                  <Td isNumeric>{investment.shares.toFixed(2)}</Td>
                  <Td isNumeric>{formatCurrency(investment.price)}</Td>
                  <Td isNumeric>
                    {formatCurrency(investment.current_price || investment.price)}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    {formatCurrency(calculateTotalValue(investment))}
                  </Td>
                  <Td isNumeric>
                    <Text 
                      fontWeight="semibold"
                      color={calculateChange(investment) >= 0 ? 'green.500' : 'red.500'}
                    >
                      {formatCurrency(calculateChange(investment))}
                      <br />
                      <span style={{ fontSize: '0.8em' }}>
                        ({investment.change_percent?.toFixed(2) || '0.00'}%)
                      </span>
                    </Text>
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FiTrash2 />}
                      colorScheme="red"
                      variant="ghost"
                      size="sm"
                      aria-label="Delete investment"
                      onClick={() => handleDelete(investment.id)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : (
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          borderStyle="dashed"
          p={8}
          textAlign="center"
        >
          <VStack spacing={4}>
            <FiDollarSign size={40} opacity={0.3} />
            <Heading size="md">No Investments Yet</Heading>
            <Text color="gray.500">
              Start building your portfolio by adding your first investment.
            </Text>
            <Button 
              colorScheme="primary" 
              leftIcon={<FiPlus />}
              onClick={onOpen}
            >
              Add Investment
            </Button>
          </VStack>
        </Box>
      )}
      
      {/* Add Investment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Investment</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Asset Search */}
              <FormControl isInvalid={formErrors.ticker}>
                <FormLabel>
                  Asset Ticker/Name
                  <Tooltip 
                    label="Search for stocks by ticker symbol or company name" 
                    hasArrow 
                    placement="top"
                  >
                    <span style={{ marginLeft: '5px' }}>ⓘ</span>
                  </Tooltip>
                </FormLabel>
                
                <Box position="relative">
                  <AssetSelector 
                    onSelectAsset={handleAssetSelect} 
                    onSearch={handleSearch}
                  />
                </Box>
                
                {formErrors.ticker && (
                  <FormErrorMessage>{formErrors.ticker}</FormErrorMessage>
                )}
              </FormControl>
              
              {selectedAsset && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Selected: {selectedAsset.name} ({selectedAsset.ticker})
                </Alert>
              )}
              
              <FormControl isInvalid={formErrors.shares}>
                <FormLabel>Number of Shares</FormLabel>
                <NumberInput 
                  min={0.01} 
                  precision={2} 
                  step={1}
                  value={formData.shares}
                  onChange={handleSharesChange}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                {formErrors.shares && (
                  <FormErrorMessage>{formErrors.shares}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl isInvalid={formErrors.price}>
                <FormLabel>Purchase Price Per Share</FormLabel>
                <NumberInput 
                  min={0} 
                  precision={2}
                  value={formData.price}
                  onChange={handlePriceChange}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                {formErrors.price && (
                  <FormErrorMessage>{formErrors.price}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl isInvalid={formErrors.date}>
                <FormLabel>Purchase Date</FormLabel>
                <Input 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  max={new Date().toISOString().split('T')[0]}
                />
                {formErrors.date && (
                  <FormErrorMessage>{formErrors.date}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl>
                <FormLabel>Asset Type</FormLabel>
                <Select 
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="stock">Stock</option>
                  <option value="etf">ETF</option>
                  <option value="bond">Bond</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="primary" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Adding"
            >
              Add Investment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default withErrorHandling(InvestmentManager, {
  componentName: 'Investment Manager',
  onError: (error) => console.error('InvestmentManager error:', error)
});
