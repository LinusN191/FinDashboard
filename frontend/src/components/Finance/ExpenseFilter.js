import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Select,
  FormControl,
  FormLabel,
  Stack,
  HStack,
  Text,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { FiFilter, FiChevronDown, FiChevronUp, FiX, FiCheck } from 'react-icons/fi';

/**
 * ExpenseFilter Component
 * Provides filtering options for expense transactions
 */
const ExpenseFilter = ({ onFilter }) => {
  const { isOpen, onToggle } = useDisclosure();
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    date: 'all',
    amount: 'all',
    payment_method: 'all'
  });
  
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Theme colors
  const filterBg = useColorModeValue('gray.50', 'gray.700');
  const badgeBg = useColorModeValue('gray.100', 'gray.600');
  const filterBorder = useColorModeValue('gray.200', 'gray.600');
  
  // Filter options
  const filterOptions = {
    type: [
      { label: 'All Types', value: 'all' },
      { label: 'Expenses', value: 'expense' },
      { label: 'Income', value: 'income' }
    ],
    category: [
      { label: 'All Categories', value: 'all' },
      { label: 'Housing', value: 'Housing' },
      { label: 'Food', value: 'Food' },
      { label: 'Transportation', value: 'Transportation' },
      { label: 'Utilities', value: 'Utilities' },
      { label: 'Entertainment', value: 'Entertainment' },
      { label: 'Health', value: 'Health' },
      { label: 'Education', value: 'Education' },
      { label: 'Shopping', value: 'Shopping' },
      { label: 'Personal', value: 'Personal' },
      { label: 'Debt', value: 'Debt' },
      { label: 'Income', value: 'Income' },
      { label: 'Other', value: 'Other' }
    ],
    date: [
      { label: 'All Time', value: 'all' },
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'week' },
      { label: 'This Month', value: 'month' },
      { label: 'This Year', value: 'year' }
    ],
    amount: [
      { label: 'Any Amount', value: 'all' },
      { label: 'Under $50', value: 'under50' },
      { label: '$50 - $100', value: '50to100' },
      { label: '$100 - $500', value: '100to500' },
      { label: 'Over $500', value: 'over500' }
    ],
    payment_method: [
      { label: 'All Methods', value: 'all' },
      { label: 'Credit Card', value: 'credit_card' },
      { label: 'Debit Card', value: 'debit_card' },
      { label: 'Cash', value: 'cash' },
      { label: 'Bank Transfer', value: 'bank_transfer' },
      { label: 'Digital Wallet', value: 'digital_wallet' },
      { label: 'Other', value: 'other' }
    ]
  };
  
  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    try {
      const newFilters = { ...filters, [filterType]: value };
      setFilters(newFilters);
      
      // Update active filters
      updateActiveFilters(newFilters);
      
      // Send filters to parent component
      if (typeof onFilter === 'function') {
        onFilter(newFilters);
      } else {
        console.warn('ExpenseFilter: onFilter prop is not a function');
      }
    } catch (error) {
      console.error('Error in ExpenseFilter handleFilterChange:', error);
    }
  };
  
  // Update active filters array for display
  const updateActiveFilters = (newFilters) => {
    try {
      const active = [];
      
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value !== 'all') {
          const option = filterOptions[key]?.find(opt => opt.value === value);
          if (option) {
            active.push({
              type: key,
              label: option.label,
              value
            });
          }
        }
      });
      
      setActiveFilters(active);
    } catch (error) {
      console.error('Error in ExpenseFilter updateActiveFilters:', error);
      setActiveFilters([]);
    }
  };
  
  // Handle clearing a specific filter
  const clearFilter = (filterType) => {
    try {
      handleFilterChange(filterType, 'all');
    } catch (error) {
      console.error('Error in ExpenseFilter clearFilter:', error);
    }
  };
  
  // Handle clearing all filters
  const clearAllFilters = () => {
    try {
      const defaultFilters = {
        type: 'all',
        category: 'all',
        date: 'all',
        amount: 'all',
        payment_method: 'all'
      };
      
      setFilters(defaultFilters);
      setActiveFilters([]);
      
      if (typeof onFilter === 'function') {
        onFilter(defaultFilters);
      } else {
        console.warn('ExpenseFilter: onFilter prop is not a function');
      }
    } catch (error) {
      console.error('Error in ExpenseFilter clearAllFilters:', error);
    }
  };
  
  // Get label for a filter value
  const getFilterLabel = (filterType, value) => {
    const option = filterOptions[filterType].find(opt => opt.value === value);
    return option ? option.label : value;
  };
  
  return (
    <Box mb={4}>
      <Flex justify="space-between" align="center" mb={2}>
        <Button
          leftIcon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
          rightIcon={<FiFilter />}
          onClick={onToggle}
          size="sm"
          variant="outline"
        >
          Filters
          {activeFilters.length > 0 && (
            <Badge ml={2} colorScheme="primary" borderRadius="full">
              {activeFilters.length}
            </Badge>
          )}
        </Button>
        
        {activeFilters.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            leftIcon={<FiX />}
            onClick={clearAllFilters}
          >
            Clear All
          </Button>
        )}
      </Flex>
      
      {/* Active filters display */}
      {activeFilters.length > 0 && (
        <Flex flexWrap="wrap" gap={2} mb={2}>
          {activeFilters.map((filter, index) => (
            <Badge
              key={index}
              colorScheme="primary"
              py={1}
              px={2}
              borderRadius="full"
              display="flex"
              alignItems="center"
            >
              <Text fontSize="xs" fontWeight="medium" mr={1}>
                {filter.label}
              </Text>
              <IconButton
                icon={<FiX />}
                size="xs"
                variant="ghost"
                colorScheme="primary"
                ml={1}
                onClick={() => clearFilter(filter.type)}
                aria-label={`Clear ${filter.label} filter`}
              />
            </Badge>
          ))}
        </Flex>
      )}
      
      {/* Filter options */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          p={4}
          bg={filterBg}
          borderRadius="md"
          borderWidth="1px"
          borderColor={filterBorder}
          mt={2}
        >
          <Stack spacing={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel fontSize="sm">Type</FormLabel>
              <Select
                size="sm"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                {filterOptions.type.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Category</FormLabel>
              <Select
                size="sm"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                {filterOptions.category.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Date</FormLabel>
              <Select
                size="sm"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
              >
                {filterOptions.date.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Amount</FormLabel>
              <Select
                size="sm"
                value={filters.amount}
                onChange={(e) => handleFilterChange('amount', e.target.value)}
              >
                {filterOptions.amount.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Payment Method</FormLabel>
              <Select
                size="sm"
                value={filters.payment_method}
                onChange={(e) => handleFilterChange('payment_method', e.target.value)}
              >
                {filterOptions.payment_method.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Stack>
          
          <HStack spacing={2} mt={4} justifyContent="flex-end">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FiX />}
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
            <Button
              size="sm"
              colorScheme="primary"
              leftIcon={<FiCheck />}
              onClick={() => onFilter(filters)}
            >
              Apply Filters
            </Button>
          </HStack>
        </Box>
      </Collapse>
    </Box>
  );
};

export default ExpenseFilter;
