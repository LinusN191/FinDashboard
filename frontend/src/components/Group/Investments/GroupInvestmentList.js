import React, { useState } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Flex,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  useColorModeValue,
  useDisclosure,
  Alert,
  AlertIcon,
  Select,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
  Progress,
  Spinner
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiMoreVertical,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';
import { useGroup } from '../../../context/GroupContext';
import GroupInvestmentForm from './GroupInvestmentForm';

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const GroupInvestmentList = ({ investments = [], availableFunds = 0, groupId }) => {
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const { addInvestment, INVESTMENT_TYPES } = useGroup();
  
  // Filter investments based on search term and filters
  const filteredInvestments = investments.filter(investment => {
    // Text search filter
    const searchTermMatch = !filter || 
      (investment.name && investment.name.toLowerCase().includes(filter.toLowerCase())) ||
      (investment.description && investment.description.toLowerCase().includes(filter.toLowerCase()));
    
    // Type filter
    const typeMatch = typeFilter === 'all' || investment.type === typeFilter;
    
    // Status filter
    const statusMatch = statusFilter === 'all' || investment.status === statusFilter;
    
    return searchTermMatch && typeMatch && statusMatch;
  });
  
  // Handle adding a new investment
  const handleAddInvestment = () => {
    setSelectedInvestment(null);
    onOpen();
  };
  
  // Handle editing an investment
  const handleEditInvestment = (investment) => {
    setSelectedInvestment(investment);
    onOpen();
  };
  
  // Handle search filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  // Handle type filter change
  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };
  
  // Handle investment deletion (placeholder function)
  const handleDeleteInvestment = (investment) => {
    console.log('Delete investment:', investment);
    // Implement actual deletion logic
  };
  
  // Handle update returns (placeholder function)
  const handleUpdateReturns = (investment) => {
    console.log('Update returns for investment:', investment);
    // Implement actual update logic
  };
  
  // Calculate stats
  const totalInvested = filteredInvestments.reduce((sum, investment) => sum + investment.amount, 0);
  const totalReturns = filteredInvestments.reduce((sum, investment) => sum + (investment.returns || 0), 0);
  const activeInvestments = filteredInvestments.filter(investment => investment.status === 'active');
  const totalActiveAmount = activeInvestments.reduce((sum, investment) => sum + investment.amount, 0);
  
  // Average ROI calculation
  const averageROI = totalActiveAmount > 0 
    ? (totalReturns / totalActiveAmount) * 100 
    : 0;
  
  // Save new or updated investment
  const handleSaveInvestment = async (investmentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (selectedInvestment) {
        // Update logic would go here
        console.log('Update investment:', investmentData);
      } else {
        await addInvestment(groupId, investmentData);
      }
      onClose();
    } catch (err) {
      setError('Failed to save investment. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box>
      {/* Error message */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Stats */}
      <StatGroup mb={6} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Stat>
          <StatLabel>Total Invested</StatLabel>
          <StatNumber>{formatCurrency(totalInvested)}</StatNumber>
          <StatHelpText>
            <HStack spacing={1}>
              <Text>{filteredInvestments.length} investments</Text>
            </HStack>
          </StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>Available Funds</StatLabel>
          <StatNumber>{formatCurrency(availableFunds)}</StatNumber>
          <StatHelpText>
            <Progress 
              value={(totalInvested / (totalInvested + availableFunds || 1)) * 100} 
              size="xs" 
              colorScheme="blue" 
              mt={1}
            />
          </StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>Total Returns</StatLabel>
          <StatNumber>{formatCurrency(totalReturns)}</StatNumber>
          <StatHelpText>
            <StatArrow type="increase" />
            {averageROI.toFixed(1)}% average ROI
          </StatHelpText>
        </Stat>
      </StatGroup>
      
      {/* Filters and Actions */}
      <Box 
        mb={4} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Text fontSize="lg" fontWeight="medium" mb={3}>
          Group Investments
        </Text>
        
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          gap={4}
          wrap="wrap"
        >
          {/* Search */}
          <InputGroup maxW={{ base: "100%", md: "320px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input 
              placeholder="Search investments..." 
              value={filter}
              onChange={handleFilterChange}
              size="md"
            />
          </InputGroup>
          
          {/* Type Filter */}
          <Select 
            maxW={{ base: "100%", md: "200px" }}
            value={typeFilter}
            onChange={handleTypeFilterChange}
            size="md"
            icon={<FiFilter />}
          >
            <option value="all">All Types</option>
            {INVESTMENT_TYPES.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </Select>
          
          {/* Status Filter */}
          <Select 
            maxW={{ base: "100%", md: "200px" }}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            size="md"
            icon={<FiFilter />}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </Select>
          
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="blue"
            onClick={handleAddInvestment}
            ml={{ base: 0, md: 'auto' }}
            size="md"
            isDisabled={availableFunds <= 0}
          >
            New Investment
          </Button>
        </Flex>
      </Box>
      
      {/* Investments Table */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        overflow="hidden"
      >
        {isLoading ? (
          <Flex justify="center" align="center" py={4}>
            <Spinner mr={2} />
            <Text>Loading investments...</Text>
          </Flex>
        ) : filteredInvestments.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text>No investments found. Adjust filters or add a new investment.</Text>
          </Box>
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Returns</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredInvestments.map((investment) => (
                <Tr key={investment.id}>
                  <Td>
                    <Text fontWeight="medium">{investment.name}</Text>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                      {investment.description}
                    </Text>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        investment.type === 'stocks' ? 'blue' :
                        investment.type === 'real estate' ? 'green' :
                        investment.type === 'bonds' ? 'purple' :
                        investment.type === 'cryptocurrencies' ? 'orange' :
                        'gray'
                      }
                      borderRadius="full"
                      px={2}
                    >
                      {investment.type.charAt(0).toUpperCase() + investment.type.slice(1)}
                    </Badge>
                  </Td>
                  <Td>{formatDate(investment.date)}</Td>
                  <Td>{formatCurrency(investment.amount)}</Td>
                  <Td>
                    <HStack>
                      <Text>{formatCurrency(investment.returns || 0)}</Text>
                      <Badge 
                        colorScheme={investment.returnsPercentage > 0 ? 'green' : 'red'}
                        fontSize="xs"
                        px={1}
                      >
                        {investment.returnsPercentage > 0 ? '+' : ''}{investment.returnsPercentage}%
                      </Badge>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        investment.status === 'active' ? 'green' :
                        investment.status === 'pending' ? 'yellow' : 'gray'
                      }
                      borderRadius="full"
                      px={2}
                    >
                      {investment.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem 
                          icon={<FiEdit2 />} 
                          onClick={() => handleEditInvestment(investment)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiRefreshCw />}
                          onClick={() => handleUpdateReturns(investment)}
                        >
                          Update Returns
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDeleteInvestment(investment)}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
      
      {/* Investment Form */}
      {isOpen && (
        <GroupInvestmentForm
          isOpen={isOpen}
          onClose={onClose}
          onSave={handleSaveInvestment}
          investment={selectedInvestment}
          availableFunds={availableFunds}
          investmentTypes={INVESTMENT_TYPES}
          isLoading={isLoading}
        />
      )}
    </Box>
  );
};

export default GroupInvestmentList;
