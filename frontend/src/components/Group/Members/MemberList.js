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
  Spinner
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiMail, 
  FiSearch,
  FiMoreVertical,
  FiUser
} from 'react-icons/fi';
import { useGroup } from '../../../context/GroupContext';

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

const MemberList = ({ members = [], groupId }) => {
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedMember, setSelectedMember] = useState(null);
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    if (!filter) return true;
    
    const searchTerm = filter.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchTerm) ||
      member.role.toLowerCase().includes(searchTerm)
    );
  });
  
  // Handle adding a new member
  const handleAddMember = () => {
    setSelectedMember(null);
    onOpen();
  };
  
  // Handle editing a member
  const handleEditMember = (member) => {
    setSelectedMember(member);
    onOpen();
  };
  
  // Handle search filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  // Handle member removal (placeholder function)
  const handleRemoveMember = (member) => {
    console.log('Remove member:', member);
    // Implement actual removal logic
  };
  
  // Handle sending invitation (placeholder function)
  const handleSendInvitation = (member) => {
    console.log('Send invitation to:', member);
    // Implement actual invitation logic
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
          Group Members
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
              placeholder="Search members..." 
              value={filter}
              onChange={handleFilterChange}
            />
          </InputGroup>
          
          <Button 
            leftIcon={<FiPlus />} 
            colorScheme="blue"
            onClick={handleAddMember}
            ml={{ base: 0, md: 'auto' }}
          >
            Add Member
          </Button>
        </Flex>
      </Box>
      
      {/* Members Table */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        overflow="hidden"
      >
        {isLoading ? (
          <Flex justify="center" align="center" py={4}>
            <Spinner mr={2} />
            <Text>Loading members...</Text>
          </Flex>
        ) : filteredMembers.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text>No members found. Adjust filter or add new members.</Text>
          </Box>
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th>Contribution Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredMembers.map((member, index) => (
                <Tr key={member.id || index}>
                  <Td>
                    <HStack>
                      <Avatar size="sm" name={member.name} />
                      <Box>
                        <Text fontWeight="medium">{member.name}</Text>
                        <Text fontSize="sm" color="gray.500">{member.email || 'No email'}</Text>
                      </Box>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={member.role === 'admin' ? 'purple' : 'gray'}
                      borderRadius="full"
                      px={2}
                    >
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </Td>
                  <Td>{formatDate(member.joinedAt)}</Td>
                  <Td>
                    <Badge 
                      colorScheme="green"
                      borderRadius="full"
                      px={2}
                    >
                      Up to date
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
                          onClick={() => handleEditMember(member)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiMail />} 
                          onClick={() => handleSendInvitation(member)}
                        >
                          Send Invitation
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleRemoveMember(member)}
                        >
                          Remove
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
      
      {/* Member Form (modal) - placeholder */}
      {/* We would implement the actual form component for adding/editing members */}
      {/* For now, this is just a placeholder */}
      {isOpen && (
        <div>
          {/* MemberForm would go here */}
          {/* 
            <MemberForm
              isOpen={isOpen}
              onClose={onClose}
              groupId={groupId}
              member={selectedMember}
            />
          */}
        </div>
      )}
    </Box>
  );
};

export default MemberList;
