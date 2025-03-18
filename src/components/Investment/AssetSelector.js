import React, { useState, useEffect } from 'react';
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
  Collapse
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { useInvestment } from '../../context/InvestmentContext';

const AssetSelector = ({ onAssetSelect }) => {
  const { searchAssets, searchResults, loading } = useInvestment();
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [localResults, setLocalResults] = useState([
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

  // Update local results when search results change
  useEffect(() => {
    if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
      setLocalResults(searchResults);
    }
  }, [searchResults]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      try {
        searchAssets(debouncedQuery);
        setIsSearchOpen(true);
      } catch (err) {
        console.error("Error searching assets:", err);
      }
    } else {
      setIsSearchOpen(query.length > 0);
    }
  }, [debouncedQuery, searchAssets]);

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
  const handleSelectAsset = (ticker, name) => {
    if (onAssetSelect) {
      onAssetSelect(ticker, name);
    }
    setQuery('');
    setIsSearchOpen(false);
  };

  // Provide default results if search isn't working
  const displayResults = Array.isArray(searchResults) && searchResults.length > 0 
    ? searchResults 
    : localResults;

  return (
    <Box position="relative" width="full">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <FiSearch color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Search for stocks, crypto, or ETFs..."
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
          ) : (
            <List spacing={0}>
              {displayResults.map((result) => (
                <ListItem key={result.ticker}>
                  <Button
                    variant="ghost"
                    width="full"
                    justifyContent="flex-start"
                    py={3}
                    px={4}
                    borderRadius={0}
                    onClick={() => handleSelectAsset(result.ticker, result.name)}
                    _hover={{ bg: hoverBgColor }}
                  >
                    <Flex width="100%" justify="space-between">
                      <Text fontWeight="bold">{result.ticker}</Text>
                      <Text>{result.name}</Text>
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
