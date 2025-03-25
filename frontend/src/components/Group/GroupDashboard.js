import React, { useState, useEffect } from 'react';
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
  Avatar,
  AvatarGroup,
  Badge,
  HStack,
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
  FormErrorMessage,
  InputGroup,
  InputLeftAddon,
  InputRightAddon
} from '@chakra-ui/react';
import { FiPlus, FiUsers, FiDollarSign, FiPieChart, FiTrendingUp, FiSave, FiArrowRight } from 'react-icons/fi';
import { useGroup } from '../../context/GroupContext';
import MemberList from './Members/MemberList';
import ContributionList from './Contributions/ContributionList';
import GroupInvestmentList from './Investments/GroupInvestmentList';
import GroupPerformance from './Reports/GroupPerformance';
import ErrorWrapper from '../ErrorWrapper';

const GroupDashboard = () => {
  const { 
    groups,
    currentGroup,
    setCurrentGroup,
    groupContributions,
    groupInvestments,
    groupMembers,
    loadGroupData,
    calculateGroupSummary,
    loading,
    fetchGroups,
    createGroup,
    addContribution,
    addInvestment
  } = useGroup();
  
  const [financialSummary, setFinancialSummary] = useState({
    totalContributed: 0,
    totalInvested: 0,
    totalReturns: 0,
    availableFunds: 0,
    averageReturn: 0,
    totalMembers: 0,
    activeInvestments: 0
  });

  // Error handling state
  const [error, setError] = useState(null);

  // Error handler function
  const handleError = (err, action) => {
    console.error(`Error ${action}:`, err);
    setError(err);
  };

  // Reset error state
  const resetError = () => setError(null);

  // Modal states
  const newGroupModal = useDisclosure();
  const newContributionModal = useDisclosure();
  const newInvestmentModal = useDisclosure();
  const toast = useToast();

  // Form states
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    contributionFrequency: 'Monthly',
    contributionAmount: '',
    active: true
  });

  const [newContributionData, setNewContributionData] = useState({
    date: new Date().toISOString().split('T')[0],
    memberId: '',
    amount: '',
    notes: ''
  });

  const [newInvestmentData, setNewInvestmentData] = useState({
    date: new Date().toISOString().split('T')[0],
    assetName: '',
    symbol: '',
    quantity: '',
    price: '',
    type: 'stock',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  
  // Load group data when group changes
  useEffect(() => {
    if (currentGroup?.id) {
      loadGroupData(currentGroup.id);
    }
  }, [currentGroup?.id, loadGroupData]);
  
  // Calculate financial summary when data changes
  useEffect(() => {
    if (!loading && groupContributions && groupInvestments) {
      const summary = calculateGroupSummary(groupContributions, groupInvestments);
      setFinancialSummary(summary);
    }
  }, [groupContributions, groupInvestments, loading, calculateGroupSummary]);
  
  // Handle group change
  const handleGroupChange = (e) => {
    const groupId = e.target.value;
    const selected = groups.find(g => g.id === groupId) || null;
    setCurrentGroup(selected);
  };

  // Handle form changes
  const handleGroupFormChange = (e) => {
    const { name, value } = e.target;
    setNewGroupData({
      ...newGroupData,
      [name]: value
    });
  };

  const handleContributionFormChange = (e) => {
    const { name, value } = e.target;
    setNewContributionData({
      ...newContributionData,
      [name]: value
    });
  };

  const handleInvestmentFormChange = (e) => {
    const { name, value } = e.target;
    setNewInvestmentData({
      ...newInvestmentData,
      [name]: value
    });
  };

  // Form validation
  const validateGroupForm = () => {
    const errors = {};
    if (!newGroupData.name.trim()) {
      errors.name = "Group name is required";
    }
    if (!newGroupData.contributionAmount || isNaN(newGroupData.contributionAmount) || Number(newGroupData.contributionAmount) <= 0) {
      errors.contributionAmount = "Valid contribution amount is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateContributionForm = () => {
    const errors = {};
    if (!newContributionData.memberId) {
      errors.memberId = "Member is required";
    }
    if (!newContributionData.amount || isNaN(newContributionData.amount) || Number(newContributionData.amount) <= 0) {
      errors.amount = "Valid amount is required";
    }
    if (!newContributionData.date) {
      errors.date = "Date is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateInvestmentForm = () => {
    const errors = {};
    if (!newInvestmentData.assetName.trim()) {
      errors.assetName = "Asset name is required";
    }
    if (!newInvestmentData.quantity || isNaN(newInvestmentData.quantity) || Number(newInvestmentData.quantity) <= 0) {
      errors.quantity = "Valid quantity is required";
    }
    if (!newInvestmentData.price || isNaN(newInvestmentData.price) || Number(newInvestmentData.price) <= 0) {
      errors.price = "Valid price is required";
    }
    if (!newInvestmentData.date) {
      errors.date = "Date is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submissions
  const handleSubmitGroup = async () => {
    if (!validateGroupForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createGroup(newGroupData);
      
      if (result) {
        newGroupModal.onClose();
        setNewGroupData({
          name: '',
          description: '',
          contributionFrequency: 'Monthly',
          contributionAmount: '',
          active: true
        });
        
        toast({
          title: "Group created",
          description: `${newGroupData.name} has been created successfully.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      handleError(error, 'creating group');
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error creating group:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitContribution = async () => {
    if (!validateContributionForm()) {
      return;
    }

    if (!currentGroup) {
      toast({
        title: "Error",
        description: "No group selected. Please select a group first.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await addContribution(currentGroup.id, newContributionData);
      
      if (result) {
        newContributionModal.onClose();
        setNewContributionData({
          date: new Date().toISOString().split('T')[0],
          memberId: '',
          amount: '',
          notes: ''
        });
        
        toast({
          title: "Contribution added",
          description: "The contribution has been recorded successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      handleError(error, 'adding contribution');
      toast({
        title: "Error",
        description: "Failed to add contribution. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error adding contribution:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInvestment = async () => {
    if (!validateInvestmentForm()) {
      return;
    }

    if (!currentGroup) {
      toast({
        title: "Error",
        description: "No group selected. Please select a group first.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await addInvestment(currentGroup.id, newInvestmentData);
      
      if (result) {
        newInvestmentModal.onClose();
        setNewInvestmentData({
          date: new Date().toISOString().split('T')[0],
          assetName: '',
          symbol: '',
          quantity: '',
          price: '',
          type: 'stock',
          notes: ''
        });
        
        toast({
          title: "Investment added",
          description: "The investment has been recorded successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      handleError(error, 'adding investment');
      toast({
        title: "Error",
        description: "Failed to add investment. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error adding investment:", error);
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
  
  // If loading, show spinner
  if (loading && !currentGroup) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" mb={4} />
        <Text>Loading investment groups...</Text>
      </Box>
    );
  }
  
  return (
    <Box maxW="7xl" mx="auto" px={{ base: '4', md: '8', lg: '12' }} py={{ base: '6', md: '8', lg: '12' }}>
      <Flex direction="column" mb={6}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" mb={1}>Group Investment Management</Heading>
            <Text color="gray.500">Manage investments, track contributions, and monitor performance</Text>
          </Box>
          <Button 
            as="a" 
            href="/" 
            colorScheme="gray" 
            variant="outline"
            leftIcon={<FiArrowRight transform="rotate(180deg)" />}
          >
            Home
          </Button>
        </Flex>
        
        {/* Group Selector */}
        <Box mb={6}>
          <Text mb={2} fontWeight="medium">Select Investment Group:</Text>
          <Flex>
            <Select 
              value={currentGroup?.id || ''} 
              onChange={handleGroupChange}
              maxW="400px"
              mr={4}
            >
              <option value="">Select a group</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Button 
              colorScheme="blue" 
              leftIcon={<FiPlus />}
              onClick={newGroupModal.onOpen}
            >
              New Group
            </Button>
          </Flex>
        </Box>
        
        {!currentGroup ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            Please select an investment group to view its dashboard
          </Alert>
        ) : (
          <>
            <Flex justify="space-between" align="center" mb={6}>
              <Box>
                <Heading as="h2" size="lg" mb={2}>{currentGroup.name}</Heading>
                <Text color="gray.500">{currentGroup.description}</Text>
              </Box>
              <HStack>
                <AvatarGroup size="sm" max={3}>
                  {groupMembers.map((member, idx) => (
                    <Avatar key={idx} name={member.name} />
                  ))}
                </AvatarGroup>
                <Text fontSize="sm">{groupMembers.length} members</Text>
              </HStack>
            </Flex>
            
            {/* Group Info Badge */}
            <HStack mb={6} spacing={4}>
              <Badge colorScheme="blue" fontSize="sm" px={2} py={1} borderRadius="full">
                {currentGroup.contributionFrequency} contributions
              </Badge>
              <Badge colorScheme="green" fontSize="sm" px={2} py={1} borderRadius="full">
                {formatCurrency(currentGroup.contributionAmount)} per cycle
              </Badge>
              <Badge colorScheme={currentGroup.active ? "green" : "red"} fontSize="sm" px={2} py={1} borderRadius="full">
                {currentGroup.active ? "Active" : "Inactive"}
              </Badge>
            </HStack>
            
            {/* Financial Summary Cards */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
              <Stat
                p={4}
                bg={bgColor}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                boxShadow="sm"
              >
                <StatLabel>Total Contributed</StatLabel>
                <StatNumber>{formatCurrency(financialSummary.totalContributed)}</StatNumber>
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
                <StatLabel>Total Invested</StatLabel>
                <StatNumber>{formatCurrency(financialSummary.totalInvested)}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  18.5%
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
                <StatLabel>Returns</StatLabel>
                <StatNumber>{formatCurrency(financialSummary.totalReturns)}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  12.3%
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
                <StatLabel>Available Funds</StatLabel>
                <StatNumber>{formatCurrency(financialSummary.availableFunds)}</StatNumber>
                <StatHelpText>
                  For new investments
                </StatHelpText>
              </Stat>
            </SimpleGrid>
            
            {/* Action Buttons */}
            <Flex mb={6} gap={4} justify="flex-end">
              <Button 
                colorScheme="blue" 
                leftIcon={<FiDollarSign />}
                onClick={newContributionModal.onOpen}
              >
                Add Contribution
              </Button>
              <Button 
                colorScheme="green" 
                leftIcon={<FiTrendingUp />}
                onClick={newInvestmentModal.onOpen}
              >
                Add Investment
              </Button>
            </Flex>
            
            {/* Main Tabs */}
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>Investments</Tab>
                <Tab>Contributions</Tab>
                <Tab>Members</Tab>
                <Tab>Performance</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel p={0} pt={4}>
                  <ErrorWrapper componentName="Group Investments">
                    <GroupInvestmentList 
                      investments={groupInvestments} 
                      onAddInvestment={newInvestmentModal.onOpen}
                    />
                  </ErrorWrapper>
                </TabPanel>
                
                <TabPanel p={0} pt={4}>
                  <ErrorWrapper componentName="Contributions">
                    <ContributionList 
                      contributions={groupContributions} 
                      members={groupMembers}
                      onAddContribution={newContributionModal.onOpen}
                    />
                  </ErrorWrapper>
                </TabPanel>
                
                <TabPanel p={0} pt={4}>
                  <ErrorWrapper componentName="Members">
                    <MemberList 
                      members={groupMembers} 
                      groupId={currentGroup.id}
                    />
                  </ErrorWrapper>
                </TabPanel>
                
                <TabPanel p={0} pt={4}>
                  <ErrorWrapper componentName="Group Performance">
                    <GroupPerformance 
                      investments={groupInvestments} 
                      contributions={groupContributions}
                    />
                  </ErrorWrapper>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </>
        )}
      </Flex>

      {/* New Group Modal */}
      <Modal isOpen={newGroupModal.isOpen} onClose={newGroupModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Investment Group</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired isInvalid={!!formErrors.name} mb={4}>
              <FormLabel>Group Name</FormLabel>
              <Input 
                name="name"
                value={newGroupData.name}
                onChange={handleGroupFormChange}
                placeholder="Enter group name"
              />
              {formErrors.name && <FormErrorMessage>{formErrors.name}</FormErrorMessage>}
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea 
                name="description"
                value={newGroupData.description}
                onChange={handleGroupFormChange}
                placeholder="Enter group description"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Contribution Frequency</FormLabel>
              <Select 
                name="contributionFrequency"
                value={newGroupData.contributionFrequency}
                onChange={handleGroupFormChange}
              >
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Custom">Custom</option>
              </Select>
            </FormControl>

            <FormControl isRequired isInvalid={!!formErrors.contributionAmount} mb={4}>
              <FormLabel>Contribution Amount</FormLabel>
              <InputGroup>
                <InputLeftAddon children="$" />
                <NumberInput min={0} w="100%">
                  <NumberInputField 
                    name="contributionAmount"
                    value={newGroupData.contributionAmount}
                    onChange={(value) => handleGroupFormChange({
                      target: { name: 'contributionAmount', value }
                    })}
                    placeholder="0.00"
                  />
                </NumberInput>
              </InputGroup>
              {formErrors.contributionAmount && <FormErrorMessage>{formErrors.contributionAmount}</FormErrorMessage>}
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={newGroupModal.onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              leftIcon={<FiSave />} 
              onClick={handleSubmitGroup}
              isLoading={isSubmitting}
            >
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Contribution Modal */}
      <Modal isOpen={newContributionModal.isOpen} onClose={newContributionModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Contribution</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired isInvalid={!!formErrors.date} mb={4}>
              <FormLabel>Date</FormLabel>
              <Input 
                name="date"
                type="date"
                value={newContributionData.date}
                onChange={handleContributionFormChange}
              />
              {formErrors.date && <FormErrorMessage>{formErrors.date}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={!!formErrors.memberId} mb={4}>
              <FormLabel>Member</FormLabel>
              <Select 
                name="memberId"
                value={newContributionData.memberId}
                onChange={handleContributionFormChange}
                placeholder="Select member"
              >
                {groupMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </Select>
              {formErrors.memberId && <FormErrorMessage>{formErrors.memberId}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={!!formErrors.amount} mb={4}>
              <FormLabel>Amount</FormLabel>
              <InputGroup>
                <InputLeftAddon children="$" />
                <NumberInput min={0} w="100%">
                  <NumberInputField 
                    name="amount"
                    value={newContributionData.amount}
                    onChange={(value) => handleContributionFormChange({
                      target: { name: 'amount', value }
                    })}
                    placeholder="0.00"
                  />
                </NumberInput>
              </InputGroup>
              {formErrors.amount && <FormErrorMessage>{formErrors.amount}</FormErrorMessage>}
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Notes</FormLabel>
              <Textarea 
                name="notes"
                value={newContributionData.notes}
                onChange={handleContributionFormChange}
                placeholder="Enter additional notes (optional)"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={newContributionModal.onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              leftIcon={<FiSave />} 
              onClick={handleSubmitContribution}
              isLoading={isSubmitting}
            >
              Save Contribution
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Investment Modal */}
      <Modal isOpen={newInvestmentModal.isOpen} onClose={newInvestmentModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Investment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired isInvalid={!!formErrors.date} mb={4}>
              <FormLabel>Date</FormLabel>
              <Input 
                name="date"
                type="date"
                value={newInvestmentData.date}
                onChange={handleInvestmentFormChange}
              />
              {formErrors.date && <FormErrorMessage>{formErrors.date}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={!!formErrors.assetName} mb={4}>
              <FormLabel>Asset Name</FormLabel>
              <Input 
                name="assetName"
                value={newInvestmentData.assetName}
                onChange={handleInvestmentFormChange}
                placeholder="Enter asset name"
              />
              {formErrors.assetName && <FormErrorMessage>{formErrors.assetName}</FormErrorMessage>}
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Symbol/Ticker</FormLabel>
              <Input 
                name="symbol"
                value={newInvestmentData.symbol}
                onChange={handleInvestmentFormChange}
                placeholder="Enter ticker symbol (optional)"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Investment Type</FormLabel>
              <Select 
                name="type"
                value={newInvestmentData.type}
                onChange={handleInvestmentFormChange}
              >
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
                <option value="bond">Bond</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="realEstate">Real Estate</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>

            <FormControl isRequired isInvalid={!!formErrors.quantity} mb={4}>
              <FormLabel>Quantity/Shares</FormLabel>
              <InputGroup>
                <InputLeftAddon children="#" />
                <NumberInput min={0} w="100%">
                  <NumberInputField 
                    name="quantity"
                    value={newInvestmentData.quantity}
                    onChange={(value) => handleInvestmentFormChange({
                      target: { name: 'quantity', value }
                    })}
                    placeholder="0"
                  />
                </NumberInput>
              </InputGroup>
              {formErrors.quantity && <FormErrorMessage>{formErrors.quantity}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={!!formErrors.price} mb={4}>
              <FormLabel>Price per Unit</FormLabel>
              <InputGroup>
                <InputLeftAddon children="$" />
                <NumberInput min={0} w="100%">
                  <NumberInputField 
                    name="price"
                    value={newInvestmentData.price}
                    onChange={(value) => handleInvestmentFormChange({
                      target: { name: 'price', value }
                    })}
                    placeholder="0.00"
                  />
                </NumberInput>
              </InputGroup>
              {formErrors.price && <FormErrorMessage>{formErrors.price}</FormErrorMessage>}
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Notes</FormLabel>
              <Textarea 
                name="notes"
                value={newInvestmentData.notes}
                onChange={handleInvestmentFormChange}
                placeholder="Enter additional notes (optional)"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={newInvestmentModal.onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              leftIcon={<FiSave />} 
              onClick={handleSubmitInvestment}
              isLoading={isSubmitting}
            >
              Save Investment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GroupDashboard;
