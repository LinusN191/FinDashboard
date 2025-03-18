import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  SimpleGrid,
  Text,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';
import { FiPlus, FiTarget } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';

// Goal Card Component
const GoalCard = ({ goal, onUpdate }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Calculate progress percentage
  const progressPercentage = Math.round((goal.current_amount / goal.target_amount) * 100);
  
  // Calculate remaining amount
  const remainingAmount = goal.target_amount - goal.current_amount;
  
  // Calculate estimated completion date
  const estimatedCompletion = getEstimatedCompletion(
    goal.current_amount,
    goal.target_amount,
    goal.monthly_contribution,
    goal.target_date
  );
  
  // Determine if goal is on track
  const isOnTrack = estimatedCompletion === 'On track' || estimatedCompletion.includes('ahead');
  
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={cardBg}
      boxShadow="sm"
      position="relative"
      overflow="hidden"
    >
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Stat>
          <StatLabel fontSize="sm" color="gray.500">{goal.name}</StatLabel>
          <StatNumber fontSize="2xl">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(goal.target_amount)}
          </StatNumber>
          <StatHelpText fontSize="xs">
            Target: {new Date(goal.target_date).toLocaleDateString()}
          </StatHelpText>
        </Stat>
        
        <Box textAlign="center">
          <CircularProgress 
            value={progressPercentage} 
            color={getProgressColor(progressPercentage)} 
            size="80px"
            thickness="10px"
          >
            <CircularProgressLabel>{progressPercentage}%</CircularProgressLabel>
          </CircularProgress>
        </Box>
      </Flex>
      
      <Box mt={4}>
        <Text fontSize="sm">
          Current: {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(goal.current_amount)}
        </Text>
        <Text fontSize="sm">
          Remaining: {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(remainingAmount)}
        </Text>
        <Text fontSize="sm">
          Monthly contribution: {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(goal.monthly_contribution)}
        </Text>
      </Box>
      
      <Flex mt={3} alignItems="center" justifyContent="space-between">
        <Text 
          fontSize="xs" 
          fontWeight="medium"
          color={isOnTrack ? 'green.500' : 'orange.500'}
        >
          {estimatedCompletion}
        </Text>
        <Button 
          size="sm" 
          colorScheme="primary" 
          variant="outline"
          onClick={() => onUpdate(goal)}
        >
          Update Progress
        </Button>
      </Flex>
    </Box>
  );
};

// Update Goal Modal Component
const UpdateGoalModal = ({ isOpen, onClose, goal, onUpdateGoal }) => {
  const [amount, setAmount] = useState('');
  const [updateType, setUpdateType] = useState('add');
  
  // Handle form submission
  const handleSubmit = () => {
    if (!amount) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    const updatedAmount = updateType === 'add' 
      ? goal.current_amount + parsedAmount
      : goal.current_amount - parsedAmount;
    
    // Ensure amount doesn't go below 0 or above target
    const finalAmount = Math.min(
      Math.max(0, updatedAmount),
      goal.target_amount
    );
    
    onUpdateGoal(goal.id, finalAmount);
    onClose();
    setAmount('');
    setUpdateType('add');
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Update Goal Progress</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {goal && (
            <>
              <Text mb={4} fontWeight="medium">
                Updating: {goal.name}
              </Text>
              
              <FormControl mb={4}>
                <FormLabel>Update Type</FormLabel>
                <Select 
                  value={updateType}
                  onChange={(e) => setUpdateType(e.target.value)}
                >
                  <option value="add">Add funds</option>
                  <option value="subtract">Withdraw funds</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Amount</FormLabel>
                <Input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </FormControl>
              
              {goal && updateType === 'add' && (
                <Box mt={4} p={2} bg="green.50" color="green.800" borderRadius="md">
                  <Text fontSize="sm">
                    Current amount: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(goal.current_amount)}
                  </Text>
                  <Text fontSize="sm">
                    After contribution: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(Math.min(
                      goal.current_amount + (parseFloat(amount) || 0),
                      goal.target_amount
                    ))}
                  </Text>
                  <Text fontSize="sm">
                    Progress: {Math.round((goal.current_amount / goal.target_amount) * 100)}% → 
                    {Math.round((Math.min(
                      goal.current_amount + (parseFloat(amount) || 0),
                      goal.target_amount
                    ) / goal.target_amount) * 100)}%
                  </Text>
                </Box>
              )}
              
              {goal && updateType === 'subtract' && (
                <Box mt={4} p={2} bg="orange.50" color="orange.800" borderRadius="md">
                  <Text fontSize="sm">
                    Current amount: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(goal.current_amount)}
                  </Text>
                  <Text fontSize="sm">
                    After withdrawal: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(Math.max(
                      goal.current_amount - (parseFloat(amount) || 0),
                      0
                    ))}
                  </Text>
                  <Text fontSize="sm">
                    Progress: {Math.round((goal.current_amount / goal.target_amount) * 100)}% → 
                    {Math.round((Math.max(
                      goal.current_amount - (parseFloat(amount) || 0),
                      0
                    ) / goal.target_amount) * 100)}%
                  </Text>
                </Box>
              )}
            </>
          )}
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="primary" 
            onClick={handleSubmit}
            isDisabled={!amount}
          >
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const SavingsGoalTracker = () => {
  const { savingsGoals, createSavingsGoal, updateSavingsGoal, loading } = useFinance();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isUpdateOpen, onOpen: onUpdateOpen, onClose: onUpdateClose } = useDisclosure();
  const [currentGoal, setCurrentGoal] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    monthly_contribution: '',
    category: 'general',
    priority: 'medium',
    notes: ''
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For numeric fields, convert to number
    if (['target_amount', 'current_amount', 'monthly_contribution'].includes(name)) {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      await createSavingsGoal(formData);
      onAddClose();
      // Reset form
      setFormData({
        name: '',
        target_amount: '',
        current_amount: '',
        target_date: '',
        monthly_contribution: '',
        category: 'general',
        priority: 'medium',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating savings goal:', error);
    }
  };
  
  // Handle update button click
  const handleUpdateClick = (goal) => {
    setCurrentGoal(goal);
    onUpdateOpen();
  };
  
  // Handle goal update
  const handleUpdateGoal = async (goalId, newAmount) => {
    try {
      await updateSavingsGoal(goalId, { current_amount: newAmount });
    } catch (error) {
      console.error('Error updating savings goal:', error);
    }
  };
  
  // Generate mock savings goals for development
  const mockSavingsGoals = [
    {
      id: 'goal1',
      name: 'Emergency Fund',
      target_amount: 10000,
      current_amount: 5500,
      target_date: '2025-12-31',
      monthly_contribution: 300,
      category: 'emergency',
      priority: 'high'
    },
    {
      id: 'goal2',
      name: 'Vacation',
      target_amount: 3000,
      current_amount: 1200,
      target_date: '2025-06-30',
      monthly_contribution: 150,
      category: 'travel',
      priority: 'medium'
    },
    {
      id: 'goal3',
      name: 'Down Payment',
      target_amount: 50000,
      current_amount: 15000,
      target_date: '2026-08-31',
      monthly_contribution: 1000,
      category: 'home',
      priority: 'high'
    },
    {
      id: 'goal4',
      name: 'New Car',
      target_amount: 15000,
      current_amount: 3000,
      target_date: '2026-03-31',
      monthly_contribution: 500,
      category: 'vehicle',
      priority: 'medium'
    }
  ];
  
  // Use actual savings goals or mock data for development
  const displayGoals = savingsGoals.length > 0 ? savingsGoals : mockSavingsGoals;
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold">Savings Goals</Text>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary" 
          onClick={onAddOpen}
        >
          Add Goal
        </Button>
      </Flex>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mt={4}>
        {displayGoals.map((goal) => (
          <GoalCard 
            key={goal.id}
            goal={goal}
            onUpdate={handleUpdateClick}
          />
        ))}
        
        {/* Show placeholder if no goals data */}
        {displayGoals.length === 0 && !loading && (
          <Box 
            p={4} 
            borderWidth="1px" 
            borderRadius="lg" 
            borderStyle="dashed"
            textAlign="center"
          >
            <Text color="gray.500">No savings goals added yet</Text>
            <Button 
              size="sm" 
              colorScheme="primary" 
              variant="outline" 
              mt={2}
              onClick={onAddOpen}
            >
              Add your first goal
            </Button>
          </Box>
        )}
      </SimpleGrid>
      
      {/* Add Goal Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Savings Goal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Goal Name</FormLabel>
                <Input 
                  name="name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Emergency Fund, Vacation"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select 
                  name="category" 
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="general">General</option>
                  <option value="emergency">Emergency Fund</option>
                  <option value="retirement">Retirement</option>
                  <option value="education">Education</option>
                  <option value="travel">Travel/Vacation</option>
                  <option value="home">Home/Real Estate</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Target Amount</FormLabel>
                <Input 
                  name="target_amount" 
                  type="number" 
                  value={formData.target_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Current Amount</FormLabel>
                <Input 
                  name="current_amount" 
                  type="number" 
                  value={formData.current_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Monthly Contribution</FormLabel>
                <Input 
                  name="monthly_contribution" 
                  type="number" 
                  value={formData.monthly_contribution}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Target Date</FormLabel>
                <Input 
                  name="target_date" 
                  type="date" 
                  value={formData.target_date}
                  onChange={handleInputChange}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Priority</FormLabel>
                <Select 
                  name="priority" 
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </FormControl>
              
              <FormControl gridColumn={{ md: "span 2" }}>
                <FormLabel>Notes (Optional)</FormLabel>
                <Input 
                  name="notes" 
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional details"
                />
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="primary" 
              onClick={handleSubmit}
              isLoading={loading}
              isDisabled={
                !formData.name || 
                !formData.target_amount || 
                !formData.target_date || 
                !formData.monthly_contribution
              }
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Update Goal Modal */}
      <UpdateGoalModal 
        isOpen={isUpdateOpen}
        onClose={onUpdateClose}
        goal={currentGoal}
        onUpdateGoal={handleUpdateGoal}
      />
    </Box>
  );
};

// Helper function to get progress color
const getProgressColor = (percentage) => {
  if (percentage < 25) return 'red.400';
  if (percentage < 50) return 'orange.400';
  if (percentage < 75) return 'blue.400';
  return 'green.400';
};

// Helper function to estimate completion
const getEstimatedCompletion = (currentAmount, targetAmount, monthlyContribution, targetDate) => {
  // If no monthly contribution, return on track if current amount meets target
  if (!monthlyContribution) {
    return currentAmount >= targetAmount ? 'Complete' : 'No contributions';
  }
  
  const remaining = targetAmount - currentAmount;
  const monthsNeeded = Math.ceil(remaining / monthlyContribution);
  
  // Calculate actual completion date
  const today = new Date();
  const estimatedDate = new Date(today);
  estimatedDate.setMonth(today.getMonth() + monthsNeeded);
  
  // Target date
  const targetDateObj = new Date(targetDate);
  
  // Calculate difference in months
  const monthDiff = (estimatedDate.getFullYear() - targetDateObj.getFullYear()) * 12 + 
                     (estimatedDate.getMonth() - targetDateObj.getMonth());
  
  if (currentAmount >= targetAmount) {
    return 'Complete';
  } else if (monthDiff < 0) {
    return `${Math.abs(monthDiff)} months ahead`;
  } else if (monthDiff > 0) {
    return `${monthDiff} months behind`;
  } else {
    return 'On track';
  }
};

export default SavingsGoalTracker;
