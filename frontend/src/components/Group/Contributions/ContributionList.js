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
  Avatar,
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
  StatGroup,
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
import ContributionForm from './ContributionForm';

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

const ContributionList = ({ contributions = [], members = [], groupId }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedContribution, setSelectedContribution] = useState(null);
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const { addContribution } = useGroup();
  
  // Filter contributions based on search term and filters
  const filteredContributions = contributions.filter(contribution => {
    // Text search filter
    const searchTermMatch = !filter || 
      (contribution.paymentMethod && contribution.paymentMethod.toLowerCase().includes(filter.toLowerCase())) ||
      (memberFilter === 'all' && getMemberName(contribution.userId).toLowerCase().includes(filter.toLowerCase()));
    
    // Status filter
    const statusMatch = statusFilter === 'all' || contribution.status === statusFilter;
    
    // Member filter
    const memberMatch = memberFilter === 'all' || contribution.userId === memberFilter;
    
    return searchTermMatch && statusMatch && memberMatch;
  });
  
  // Handle adding a new contribution
  const handleAddContribution = () => {
    setSelectedContribution(null);
    onOpen();
  };
  
  // Handle editing a contribution
  const handleEditContribution = (contribution) => {
    setSelectedContribution(contribution);
    onOpen();
  };
  
  // Handle search filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };
  
  // Handle member filter change
  const handleMemberFilterChange = (e) => {
    setMemberFilter(e.target.value);
  };
  
  // Handle contribution deletion (placeholder function)
  const handleDeleteContribution = (contribution) => {
    console.log('Delete contribution:', contribution);
    // Implement actual deletion logic
  };
  
  // Get member name from userId
  const getMemberName = (userId) => {
    const member = members.find(m => m.id === userId);
    return member ? member.name : 'Unknown Member';
  };
  
  // Calculate stats
  const totalContributions = filteredContributions.reduce((sum, contrib) => sum + contrib.amount, 0);
  const completedContributions = filteredContributions
    .filter(contrib => contrib.status === 'completed')
    .reduce((sum, contrib) => sum + contrib.amount, 0);
  const pendingContributions = filteredContributions
    .filter(contrib => contrib.status === 'pending')
    .reduce((sum, contrib) => sum + contrib.amount, 0);
  
  // Save new or updated contribution
  const handleSaveContribution = async (contributionData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (selectedContribution) {
        // Update logic would go here
        console.log('Update contribution:', contributionData);
      } else {
        await addContribution(groupId, contributionData);
      }
      onClose();
    } catch (err) {
      setError('Failed to save contribution. Please try again.');
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
          <StatLabel>Total Contributions</StatLabel>
          <StatNumber>{formatCurrency(totalContributions)}</StatNumber>
        </Stat>
        
        <Stat>
          <StatLabel>Completed</StatLabel>
          <StatNumber>{formatCurrency(completedContributions)}</StatNumber>
        </Stat>
        
        <Stat>
          <StatLabel>Pending</StatLabel>
          <StatNumber>{formatCurrency(pendingContributions)}</StatNumber>
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
          Contribution Management
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
              placeholder="Search contributions..." 
              value={filter}
              onChange={handleFilterChange}
              size="md"
            />
          </InputGroup>
          
          {/* Status Filter */}
          <Select 
            maxW={{ base: "100%", md: "200px" }}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            size="md"
            icon={<FiFilter />}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          
          {/* Member Filter */}
          <Select 
            maxW={{ base: "100%", md: "200px" }}
            value={memberFilter}
            onChange={handleMemberFilterChange}
            size="md"
            icon={<FiFilter />}
          >
            <option value="all">All Members</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
          
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="blue"
            onClick={handleAddContribution}
            ml={{ base: 0, md: 'auto' }}
            size="md"
          >
            Add Contribution
          </Button>
        </Flex>
      </Box>
      
      {/* Contributions Table */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        overflow="hidden"
      >
        {isLoading ? (
          <Flex justify="center" align="center" py={4}>
            <Spinner mr={2} />
            <Text>Loading contributions...</Text>
          </Flex>
        ) : filteredContributions.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text>No contributions found. Adjust filters or add a new contribution.</Text>
          </Box>
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Member</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Payment Method</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredContributions.map((contribution) => (
                <Tr key={contribution.id}>
                  <Td>
                    <HStack>
                      <Avatar size="sm" name={getMemberName(contribution.userId)} />
                      <Text>{getMemberName(contribution.userId)}</Text>
                    </HStack>
                  </Td>
                  <Td>{formatDate(contribution.date)}</Td>
                  <Td>{formatCurrency(contribution.amount)}</Td>
                  <Td>{contribution.paymentMethod}</Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        contribution.status === 'completed' ? 'green' :
                        contribution.status === 'pending' ? 'yellow' : 'red'
                      }
                      borderRadius="full"
                      px={2}
                    >
                      {contribution.status}
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
                          onClick={() => handleEditContribution(contribution)}
                        >
                          Edit
                        </MenuItem>
                        {contribution.status === 'pending' && (
                          <MenuItem 
                            icon={<FiRefreshCw />}
                          >
                            Mark as Completed
                          </MenuItem>
                        )}
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDeleteContribution(contribution)}
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
      
      {/* Contribution Form */}
      {isOpen && (
        <ContributionForm
          isOpen={isOpen}
          onClose={onClose}
          onSave={handleSaveContribution}
          contribution={selectedContribution}
          members={members}
          isLoading={isLoading}
        />
      )}
    </Box>
  );
};

export default ContributionList;
