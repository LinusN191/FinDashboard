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
  Badge,
  Tooltip,
  HStack,
  Tag,
  TagLabel,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { FiSearch, FiTrendingUp, FiDollarSign, FiFilter, FiMoreVertical } from 'react-icons/fi';
import { useInvestment } from '../../context/InvestmentContext';

const AssetSelector = ({ onAssetSelect, onCompareSelect, activeFilters = {} }) => {
  const { searchAssets, searchResults, loading, assetTypes } = useInvestment();
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  
  // Default assets to show when no search is performed
  const [defaultAssets] = useState([
    { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'etf', exchange: 'NYSE' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', exchange: 'NASDAQ' },
    { ticker: 'BTC-USD', name: 'Bitcoin USD', type: 'crypto', exchange: 'CRYPTO' }
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
        // Extract filters from activeFilters prop
        const assetType = activeFilters?.assetType || null;
        const characteristics = activeFilters?.characteristics || [];
        
        if (searchAssets) {
          // Pass the filters to the searchAssets function
          searchAssets(debouncedQuery, assetType, characteristics);
          setSearchPerformed(true);
        }
        setIsSearchOpen(true);
      } catch (err) {
        console.error("Error searching assets:", err);
      }
    } else {
      setIsSearchOpen(query.length > 0);
      setSearchPerformed(false);
    }
  }, [debouncedQuery, searchAssets, activeFilters]);

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
      setSearchPerformed(false);
    }
  };

  // Handle asset selection
  const handleSelectAsset = (ticker, name, type = 'stock') => {
    if (onAssetSelect) {
      onAssetSelect(ticker, name, type);
    }
    setQuery('');
    setIsSearchOpen(false);
    setSearchPerformed(false);
  };

  // Handle comparison selection
  const handleCompareSelect = (ticker, name) => {
    if (onCompareSelect) {
      try {
        onCompareSelect(ticker);
      } catch (err) {
        console.error("Error handling comparison selection:", err);
      }
    }
    setQuery('');
    setIsSearchOpen(false);
    setSearchPerformed(false);
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

  // Get asset type display name from ID
  const getAssetTypeName = (typeId) => {
    if (!typeId || !assetTypes || assetTypes.length === 0) return typeId;
    const typeObj = assetTypes.find(t => t.id === typeId);
    return typeObj ? typeObj.name : typeId;
  };

  // Check if any filters are active
  const hasActiveFilters = activeFilters && 
    (activeFilters.assetType || (activeFilters.characteristics && activeFilters.characteristics.length > 0));

  // Provide default results if search isn't working or no search performed
  let displayResults = Array.isArray(searchResults) && searchResults.length > 0 && searchPerformed
    ? searchResults 
    : defaultAssets;
    
  // Apply assetType filter to default assets if needed (when no search performed)
  if (!searchPerformed && activeFilters?.assetType) {
    displayResults = displayResults.filter(asset => 
      asset.type?.toLowerCase() === activeFilters.assetType.toLowerCase()
    );
  }

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

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <Flex align="center" mb={3}>
          <FiFilter color="gray.500" size="14px" />
          <Text fontSize="xs" color="gray.500" ml={1} mr={2}>Filters:</Text>
          <HStack spacing={1}>
            {activeFilters.assetType && (
              <Tag size="sm" colorScheme={getAssetTypeColor(activeFilters.assetType)} variant="subtle">
                <TagLabel>{getAssetTypeName(activeFilters.assetType)}</TagLabel>
              </Tag>
            )}
            {activeFilters.characteristics && activeFilters.characteristics.length > 0 && (
              <Tag size="sm" colorScheme="green" variant="subtle">
                <TagLabel>{activeFilters.characteristics.length} traits</TagLabel>
              </Tag>
            )}
          </HStack>
        </Flex>
      )}

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
              <Text color="gray.500">No results found. Try adjusting your search or filters.</Text>
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
                        <Tooltip label={result.type}>
                          <Badge colorScheme={getAssetTypeColor(result.type)}>
                            {result.type}
                          </Badge>
                        </Tooltip>
                        {onCompareSelect && (
                          <Tooltip label="Compare with this asset">
                            <IconButton
                              icon={<FiMoreVertical />}
                              variant="ghost"
                              size="sm"
                              ml={1}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompareSelect(result.ticker, result.name);
                              }}
                              aria-label="Compare"
                            />
                          </Tooltip>
                        )}
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
