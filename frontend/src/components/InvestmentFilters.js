import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Select,
  CheckboxGroup,
  Checkbox,
  Button,
  Heading,
  Text,
  Collapse,
  useDisclosure,
  Stack,
  Divider,
  Badge,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from '@chakra-ui/icons';
import { useInvestment } from '../context/InvestmentContext';

const InvestmentFilters = ({ onFilterChange, initialFilters = {} }) => {
  const { assetTypes, assetCharacteristics, fetchAssetFilters, loading: contextLoading } = useInvestment();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
  
  const [selectedType, setSelectedType] = useState(initialFilters.assetType || '');
  const [selectedCharacteristics, setSelectedCharacteristics] = useState(initialFilters.characteristics || []);
  const [activeFilters, setActiveFilters] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch asset types and characteristics if not already loaded
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLocalLoading(true);
        if ((!assetTypes || assetTypes.length === 0) && fetchAssetFilters) {
          await fetchAssetFilters();
        }
      } catch (err) {
        console.error("Error loading filters:", err);
        setError("Failed to load filter options");
      } finally {
        // Set loading to false after a minimum time to prevent UI flicker
        setTimeout(() => {
          setLocalLoading(false);
        }, 500);
      }
    };
    
    loadFilters();
  }, []);

  // Update active filters display when selections change
  useEffect(() => {
    const newFilters = [];
    
    // Add asset type to active filters if selected
    if (selectedType) {
      const typeObj = assetTypes.find(type => type.id === selectedType);
      if (typeObj) {
        newFilters.push({ 
          id: `type-${typeObj.id}`, 
          type: 'asset-type',
          label: typeObj.name,
          value: typeObj.id
        });
      }
    }
    
    // Add characteristics to active filters
    if (selectedCharacteristics.length > 0) {
      selectedCharacteristics.forEach(charId => {
        const charObj = assetCharacteristics.find(char => char.id === charId);
        if (charObj) {
          newFilters.push({
            id: `char-${charObj.id}`,
            type: 'characteristic',
            label: charObj.name,
            value: charObj.id
          });
        }
      });
    }
    
    setActiveFilters(newFilters);
    
    // Notify parent component of filter changes
    if (onFilterChange) {
      onFilterChange({
        assetType: selectedType,
        characteristics: selectedCharacteristics
      });
    }
  }, [selectedType, selectedCharacteristics, assetTypes, assetCharacteristics, onFilterChange]);

  // Get asset type display name from ID
  const getAssetTypeName = (typeId) => {
    if (!typeId || !assetTypes || assetTypes.length === 0) return typeId;
    const typeObj = assetTypes.find(t => t.id === typeId);
    return typeObj ? typeObj.name : typeId;
  };

  // Handle asset type selection
  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
  };

  // Handle characteristic selection
  const handleCharacteristicChange = (values) => {
    setSelectedCharacteristics(values);
  };

  // Handle removing a filter
  const removeFilter = (filterId) => {
    const filter = activeFilters.find(f => f.id === filterId);
    
    if (filter) {
      if (filter.type === 'asset-type') {
        setSelectedType('');
      } else if (filter.type === 'characteristic') {
        setSelectedCharacteristics(prev => 
          prev.filter(id => id !== filter.value)
        );
      }
    }
  };

  // Handle applying filters
  const applyFilters = () => {
    if (typeof onFilterChange === 'function') {
      try {
        onFilterChange({
          assetType: selectedType,
          characteristics: selectedCharacteristics || []
        });
      } catch (err) {
        console.error("Error applying filters:", err);
        setError("Failed to apply filters");
      }
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedType('');
    setSelectedCharacteristics([]);
  };

  return (
    <Box mb={4} borderWidth="1px" borderRadius="lg" p={4} bg="white" shadow="sm">
      <Flex justify="space-between" align="center" onClick={onToggle} cursor="pointer" mb={isOpen ? 4 : 0}>
        <Heading size="sm">Filter Investments</Heading>
        {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </Flex>
      
      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <Box mb={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Active Filters ({activeFilters.length})
            </Text>
            <Button 
              size="xs" 
              colorScheme="blue" 
              variant="ghost" 
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          </Flex>
          <Wrap spacing={2}>
            {activeFilters.map(filter => (
              <WrapItem key={filter.id}>
                <Tag 
                  size="md" 
                  borderRadius="full" 
                  variant="subtle"
                  colorScheme={filter.type === 'asset-type' ? 'blue' : 'green'}
                >
                  <TagLabel>{filter.label}</TagLabel>
                  <TagCloseButton onClick={() => removeFilter(filter.id)} />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}
      
      <Collapse in={isOpen} animateOpacity>
        {localLoading || contextLoading ? (
          <Flex justify="center" align="center" py={6}>
            <Spinner size="md" mr={3} />
            <Text>Loading filter options...</Text>
          </Flex>
        ) : error ? (
          <Alert status="error" mt={4}>
            <AlertIcon />
            {error}
          </Alert>
        ) : (
          <Box mt={4}>
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">Asset Type</Text>
              <Select 
                placeholder="All Asset Types" 
                value={selectedType} 
                onChange={handleTypeChange}
              >
                {assetTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </Select>
            </Box>
            
            <Divider />
            
            <Box>
              <Text mb={2} fontWeight="medium" fontSize="sm">Asset Characteristics</Text>
              <CheckboxGroup 
                colorScheme="blue" 
                value={selectedCharacteristics}
                onChange={handleCharacteristicChange}
              >
                <Stack spacing={2}>
                  {assetCharacteristics.map(char => (
                    <Checkbox key={char.id} value={char.id}>
                      {char.name}
                      <Text as="span" fontSize="xs" color="gray.500" ml={1}>
                        ({char.description})
                      </Text>
                    </Checkbox>
                  ))}
                </Stack>
              </CheckboxGroup>
            </Box>
            
            <Flex justify="flex-end">
              <Button 
                size="sm" 
                variant="outline" 
                colorScheme="red" 
                mr={2}
                onClick={clearAllFilters}
              >
                Reset
              </Button>
              <Button 
                size="sm" 
                colorScheme="blue"
                onClick={applyFilters}
              >
                Apply Filters
              </Button>
            </Flex>
          </Box>
        )}
      </Collapse>
    </Box>
  );
};

export default InvestmentFilters;
