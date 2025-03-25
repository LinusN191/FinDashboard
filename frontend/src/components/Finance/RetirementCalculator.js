import React, { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  SimpleGrid,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Alert,
  AlertIcon,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { FiDollarSign, FiCalendar } from 'react-icons/fi';

const RetirementCalculator = ({ isOpen, onClose }) => {
  // Default values
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [annualContribution, setAnnualContribution] = useState(6000);
  const [expectedReturn, setExpectedReturn] = useState(7); // annual return in percentage
  const [inflationRate, setInflationRate] = useState(2.5); // inflation rate in percentage
  const [taxBenefit, setTaxBenefit] = useState(0); // calculated tax benefit

  // Results
  const [projectedSavings, setProjectedSavings] = useState(0);
  const [adjustedForInflation, setAdjustedForInflation] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [error, setError] = useState('');

  // Calculate retirement projections
  const calculateRetirement = useCallback(() => {
    try {
      setError('');
      
      // Validate inputs
      if (currentAge >= retirementAge) {
        setError('Retirement age must be greater than current age');
        return;
      }
      
      if (expectedReturn < 0 || expectedReturn > 20) {
        setError('Expected return should be between 0% and 20%');
        return;
      }
      
      // Calculate years until retirement
      const yearsToRetirement = retirementAge - currentAge;
      
      // Calculate tax benefit (simplified - assumes 22% tax bracket)
      const estimatedTaxRate = 0.22;
      const yearlyTaxBenefit = annualContribution * estimatedTaxRate;
      setTaxBenefit(yearlyTaxBenefit);
      
      // Calculate future value of current savings
      const returnRate = expectedReturn / 100;
      let futureValue = currentSavings * Math.pow(1 + returnRate, yearsToRetirement);
      
      // Calculate future value of annual contributions (assuming end-of-year contributions)
      let contributionFutureValue = 0;
      for (let i = 0; i < yearsToRetirement; i++) {
        contributionFutureValue += annualContribution * Math.pow(1 + returnRate, i);
      }
      
      // Total projected savings
      const totalProjectedSavings = futureValue + contributionFutureValue;
      setProjectedSavings(totalProjectedSavings);
      
      // Adjust for inflation
      const inflationAdjustedValue = totalProjectedSavings / Math.pow(1 + inflationRate/100, yearsToRetirement);
      setAdjustedForInflation(inflationAdjustedValue);
      
      // Estimate monthly income in retirement (using 4% withdrawal rule)
      const yearlyWithdrawal = inflationAdjustedValue * 0.04;
      setMonthlyIncome(yearlyWithdrawal / 12);
      
      setHasCalculated(true);
    } catch (err) {
      console.error('Error calculating retirement projections:', err);
      setError('Failed to calculate retirement projections. Please check your inputs.');
    }
  }, [
    currentAge, 
    retirementAge, 
    currentSavings, 
    annualContribution, 
    expectedReturn, 
    inflationRate
  ]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Background colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const statBgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Retirement Calculator</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Current Age</FormLabel>
                <NumberInput
                  min={18}
                  max={80}
                  value={currentAge}
                  onChange={(valueString) => setCurrentAge(parseInt(valueString))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              
              <FormControl>
                <FormLabel>Retirement Age</FormLabel>
                <NumberInput
                  min={currentAge + 1}
                  max={100}
                  value={retirementAge}
                  onChange={(valueString) => setRetirementAge(parseInt(valueString))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </SimpleGrid>
            
            <FormControl>
              <FormLabel>Current Retirement Savings</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiDollarSign color="gray.300" />
                </InputLeftElement>
                <Input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(parseFloat(e.target.value))}
                  placeholder="Current savings"
                />
              </InputGroup>
            </FormControl>
            
            <FormControl>
              <FormLabel>Annual Contribution</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiDollarSign color="gray.300" />
                </InputLeftElement>
                <Input
                  type="number"
                  value={annualContribution}
                  onChange={(e) => setAnnualContribution(parseFloat(e.target.value))}
                  placeholder="Annual contribution"
                />
              </InputGroup>
            </FormControl>
            
            <FormControl>
              <FormLabel>Expected Annual Return (%): {expectedReturn}%</FormLabel>
              <Slider
                min={1}
                max={15}
                step={0.5}
                value={expectedReturn}
                onChange={(v) => setExpectedReturn(v)}
                colorScheme="teal"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>
            
            <FormControl>
              <FormLabel>Expected Inflation Rate (%): {inflationRate}%</FormLabel>
              <Slider
                min={0}
                max={10}
                step={0.1}
                value={inflationRate}
                onChange={(v) => setInflationRate(v)}
                colorScheme="orange"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>
            
            <Button colorScheme="blue" onClick={calculateRetirement} size="lg">
              Calculate
            </Button>
            
            {hasCalculated && (
              <Box mt={6}>
                <Heading size="md" mb={4}>Retirement Projection</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Stat bg={statBgColor} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    <StatLabel>Projected Savings at Retirement</StatLabel>
                    <StatNumber>{formatCurrency(projectedSavings)}</StatNumber>
                    <StatHelpText>Before inflation adjustment</StatHelpText>
                  </Stat>
                  
                  <Stat bg={statBgColor} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    <StatLabel>Adjusted for Inflation</StatLabel>
                    <StatNumber>{formatCurrency(adjustedForInflation)}</StatNumber>
                    <StatHelpText>In today's dollars</StatHelpText>
                  </Stat>
                  
                  <Stat bg={statBgColor} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    <StatLabel>Estimated Monthly Income</StatLabel>
                    <StatNumber>{formatCurrency(monthlyIncome)}</StatNumber>
                    <StatHelpText>Using 4% withdrawal rule</StatHelpText>
                  </Stat>
                  
                  <Stat bg={statBgColor} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    <StatLabel>Estimated Tax Benefit</StatLabel>
                    <StatNumber>{formatCurrency(taxBenefit)}</StatNumber>
                    <StatHelpText>Per year with current contribution</StatHelpText>
                  </Stat>
                </SimpleGrid>
                
                <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={statBgColor}>
                  <Text fontWeight="bold" mb={2}>Recommendation:</Text>
                  <Text>
                    {annualContribution < 6000 ? 
                      "Consider increasing your annual contributions to at least $6,000 to maximize tax benefits." :
                      annualContribution < 15000 ?
                      "Your contributions are good. If possible, consider increasing them to build a larger nest egg." :
                      "Your contributions are excellent! You're on track for a well-funded retirement."}
                  </Text>
                </Box>
              </Box>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="gray" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RetirementCalculator;
