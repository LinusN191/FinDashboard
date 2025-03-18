import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  List,
  ListItem,
  Flex,
  Text,
  Spinner,
  useColorModeValue,
  Collapse,
  Badge
} from '@chakra-ui/react';
import { FiSearch, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { useInvestment } from '../../context/InvestmentContext';

const AssetSelector = ({ onSelectAsset, onSearch }) => {
  const { searchAssets, searchResults, loading } = useInvestment();
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  
  // Default assets to show when no search is performed
  const [defaultAssets] = useState([
    { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
  ]);

  // Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.600');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      try {
        // Use the provided onSearch callback if available
        if (onSearch) {
          onSearch(debouncedQuery);
        } else if (searchAssets) {
          searchAssets(debouncedQuery);
        }
        setIsSearchOpen(true);
      } catch (err) {
        console.error("Error searching assets:", err);
      }
    } else {
      setIsSearchOpen(query.length > 0);
    }
  }, [debouncedQuery, searchAssets, onSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) && 
        listRef.current && 
        !listRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.length > 0) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  };

  // Handle asset selection
  const handleSelectAsset = (ticker, name, type = 'stock') => {
    if (onSelectAsset) {
      onSelectAsset(ticker, name, type);
    }
    setQuery('');
    setIsSearchOpen(false);
  };

  // Get badge color based on asset type
  const getAssetTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'stock':
        return 'blue';
      case 'etf':
        return 'green';
      case 'crypto':
        return 'purple';
      case 'bond':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // Provide default results if search isn't working or no search performed
  const displayResults = Array.isArray(searchResults) && searchResults.length > 0 
    ? searchResults 
    : defaultAssets;

  return (
    <Box position="relative" width="full">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <FiSearch color="gray.300" />
        </InputLeftElement>
        <Input
          ref={inputRef}
          placeholder="Search for stocks by name or ticker symbol..."
          value={query}
          onChange={handleInputChange}
          borderColor={borderColor}
          _focus={{ borderColor: 'primary.500' }}
          onFocus={() => {
            if (query.length > 0) setIsSearchOpen(true);
          }}
        />
      </InputGroup>

      <Collapse in={isSearchOpen} animateOpacity>
        <Box
          ref={listRef}
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={2}
          bg={bgColor}
          borderRadius="md"
          borderWidth="1px"
          borderColor={borderColor}
          boxShadow="md"
          maxH="300px"
          overflowY="auto"
          zIndex={10}
        >
          {loading ? (
            <Flex justify="center" align="center" p={4}>
              <Spinner size="sm" color="primary.500" mr={2} />
              <Text>Searching...</Text>
            </Flex>
          ) : displayResults.length === 0 ? (
            <Box p={4} textAlign="center">
              <Text color="gray.500">No results found. Try another search.</Text>
            </Box>
          ) : (
            <List spacing={0}>
              {displayResults.map((result) => (
                <ListItem key={result.ticker} borderBottomWidth="1px" borderColor={borderColor} _last={{ borderBottomWidth: 0 }}>
                  <Button
                    variant="ghost"
                    width="full"
                    justifyContent="flex-start"
                    py={3}
                    px={4}
                    borderRadius={0}
                    onClick={() => handleSelectAsset(result.ticker, result.name, result.type)}
                    _hover={{ bg: hoverBgColor }}
                  >
                    <Flex width="100%" justify="space-between" align="center">
                      <Flex align="center">
                        {result.type === 'crypto' ? (
                          <FiDollarSign style={{ marginRight: '8px' }} />
                        ) : (
                          <FiTrendingUp style={{ marginRight: '8px' }} />
                        )}
                        <Box>
                          <Text fontWeight="bold">{result.ticker}</Text>
                          <Text fontSize="xs" color="gray.500">{result.exchange}</Text>
                        </Box>
                      </Flex>
                      <Flex align="center">
                        <Text mr={2} noOfLines={1} maxW="160px" textAlign="right">{result.name}</Text>
                        <Badge colorScheme={getAssetTypeColor(result.type)}>
                          {result.type || 'stock'}
                        </Badge>
                      </Flex>
                    </Flex>
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default AssetSelector;
