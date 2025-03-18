import React, { useState, useEffect } from 'react';
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
  Text,
  Heading,
  SimpleGrid,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { useFinance } from '../../context/FinanceContext';

// Debt Card Component
const DebtCard = ({ debt, onPayoffClick }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Calculate paid percentage
  const paidPercentage = Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100);
  
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={cardBg}
      boxShadow="sm"
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.500">{debt.name}</StatLabel>
        <StatNumber fontSize="2xl">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(debt.remaining_amount)}
        </StatNumber>
        <StatHelpText fontSize="xs">
          {debt.type} | {debt.interest_rate}% interest
        </StatHelpText>
      </Stat>
      
      <Progress 
        value={paidPercentage} 
        colorScheme="green" 
        size="sm" 
        mt={3} 
        borderRadius="full"
      />
      
      <Flex mt={2} justifyContent="space-between" alignItems="center">
        <Text fontSize="xs">
          {paidPercentage}% paid
        </Text>
        <Text fontSize="xs">
          Min payment: {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(debt.minimum_payment)}
        </Text>
      </Flex>
      
      <Button 
        mt={3} 
        size="sm" 
        colorScheme="primary" 
        width="full"
        onClick={() => onPayoffClick(debt)}
      >
        Payoff Strategy
      </Button>
    </Box>
  );
};

// Payoff Strategy Component
const PayoffStrategy = ({ debt, additionalPayment = 0, strategy = null }) => {
  const [payment, setPayment] = useState(additionalPayment);
  const [payoffData, setPayoffData] = useState(strategy);
  const { getDebtPayoffStrategy } = useFinance();
  
  useEffect(() => {
    const fetchPayoffStrategy = async () => {
      const data = await getDebtPayoffStrategy(debt.id, payment);
      if (data) {
        setPayoffData(data);
      }
    };
    
    fetchPayoffStrategy();
  }, [debt.id, payment, getDebtPayoffStrategy]);
  
  if (!payoffData) {
    return <Box p={4}>Loading payoff strategy...</Box>;
  }
  
  return (
    <Box>
      <Heading size="md" mb={4}>Payoff Strategy for {debt.name}</Heading>
      
      <FormControl mb={4}>
        <FormLabel>Additional Monthly Payment</FormLabel>
        <NumberInput 
          value={payment} 
          onChange={(valueString) => setPayment(Number(valueString))}
          min={0}
          max={10000}
          step={10}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          bg={useColorModeValue('white', 'gray.700')}
        >
          <Heading size="sm" mb={3}>With Minimum Payment</Heading>
          <Text>
            <strong>Months to payoff:</strong> {payoffData.minimum_payment_strategy.months_to_payoff}
          </Text>
          <Text>
            <strong>Total interest paid:</strong> {
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(payoffData.minimum_payment_strategy.total_interest_paid)
            }
          </Text>
          <Text>
            <strong>Payoff date:</strong> {payoffData.minimum_payment_strategy.payoff_date}
          </Text>
        </Box>
        
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          bg={useColorModeValue('white', 'gray.700')}
        >
          <Heading size="sm" mb={3}>With Additional Payment</Heading>
          <Text>
            <strong>Months to payoff:</strong> {payoffData.accelerated_payment_strategy.months_to_payoff}
          </Text>
          <Text>
            <strong>Total interest paid:</strong> {
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(payoffData.accelerated_payment_strategy.total_interest_paid)
            }
          </Text>
          <Text>
            <strong>Payoff date:</strong> {payoffData.accelerated_payment_strategy.payoff_date}
          </Text>
        </Box>
      </SimpleGrid>
      
      <Box 
        mt={4} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg" 
        bg={useColorModeValue('green.50', 'green.900')}
        color={useColorModeValue('green.800', 'green.100')}
      >
        <Heading size="sm" mb={2}>Savings</Heading>
        <Text>
          <strong>Months saved:</strong> {payoffData.savings.months_saved}
        </Text>
        <Text>
          <strong>Interest saved:</strong> {
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(payoffData.savings.interest_saved)
          }
        </Text>
      </Box>
    </Box>
  );
};

const DebtTracker = () => {
  const { debts, createDebt, loading } = useFinance();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isPayoffOpen, onOpen: onPayoffOpen, onClose: onPayoffClose } = useDisclosure();
  const [currentDebt, setCurrentDebt] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'credit_card',
    total_amount: '',
    remaining_amount: '',
    interest_rate: '',
    minimum_payment: '',
    due_date: '',
    notes: ''
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For numeric fields, convert to number
    if (['total_amount', 'remaining_amount', 'interest_rate', 'minimum_payment'].includes(name)) {
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
      await createDebt(formData);
      onAddClose();
      // Reset form
      setFormData({
        name: '',
        type: 'credit_card',
        total_amount: '',
        remaining_amount: '',
        interest_rate: '',
        minimum_payment: '',
        due_date: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating debt:', error);
    }
  };
  
  // Handle payoff strategy click
  const handlePayoffClick = (debt) => {
    setCurrentDebt(debt);
    onPayoffOpen();
  };
  
  // Generate mock debts if needed for development
  const mockDebts = [
    {
      id: 'debt1',
      name: 'Credit Card',
      type: 'credit_card',
      total_amount: 5000,
      remaining_amount: 3500,
      interest_rate: 15.99,
      minimum_payment: 75,
      due_date: '2025-04-15'
    },
    {
      id: 'debt2',
      name: 'Student Loan',
      type: 'student_loan',
      total_amount: 25000,
      remaining_amount: 18000,
      interest_rate: 4.5,
      minimum_payment: 250,
      due_date: '2025-04-01'
    },
    {
      id: 'debt3',
      name: 'Car Loan',
      type: 'loan',
      total_amount: 15000,
      remaining_amount: 9000,
      interest_rate: 3.9,
      minimum_payment: 300,
      due_date: '2025-04-10'
    }
  ];
  
  // Use actual debts or mock data for development
  const displayDebts = debts.length > 0 ? debts : mockDebts;
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold">Debt Tracker</Text>
        <Button 
          leftIcon={<FiPlus />} 
          colorScheme="primary" 
          onClick={onAddOpen}
        >
          Add Debt
        </Button>
      </Flex>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mt={4}>
        {displayDebts.map((debt) => (
          <DebtCard 
            key={debt.id}
            debt={debt}
            onPayoffClick={handlePayoffClick}
          />
        ))}
        
        {/* Show placeholder if no debt data */}
        {displayDebts.length === 0 && !loading && (
          <Box 
            p={4} 
            borderWidth="1px" 
            borderRadius="lg" 
            borderStyle="dashed"
            textAlign="center"
          >
            <Text color="gray.500">No debts added yet</Text>
            <Button 
              size="sm" 
              colorScheme="primary" 
              variant="outline" 
              mt={2}
              onClick={onAddOpen}
            >
              Add your first debt
            </Button>
          </Box>
        )}
      </SimpleGrid>
      
      {/* Add Debt Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Debt</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Debt Name</FormLabel>
                <Input 
                  name="name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Credit Card, Student Loan"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select 
                  name="type" 
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="student_loan">Student Loan</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="loan">Personal Loan</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Total Amount</FormLabel>
                <Input 
                  name="total_amount" 
                  type="number" 
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Remaining Amount</FormLabel>
                <Input 
                  name="remaining_amount" 
                  type="number" 
                  value={formData.remaining_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Interest Rate (%)</FormLabel>
                <Input 
                  name="interest_rate" 
                  type="number" 
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  placeholder="0.00%"
                  step="0.01"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Minimum Payment</FormLabel>
                <Input 
                  name="minimum_payment" 
                  type="number" 
                  value={formData.minimum_payment}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Due Date</FormLabel>
                <Input 
                  name="due_date" 
                  type="date" 
                  value={formData.due_date}
                  onChange={handleInputChange}
                />
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
                !formData.total_amount || 
                !formData.remaining_amount || 
                !formData.interest_rate || 
                !formData.minimum_payment
              }
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Payoff Strategy Modal */}
      <Modal isOpen={isPayoffOpen} onClose={onPayoffClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Debt Payoff Strategy</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentDebt && (
              <PayoffStrategy debt={currentDebt} additionalPayment={50} />
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button colorScheme="primary" onClick={onPayoffClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DebtTracker;
