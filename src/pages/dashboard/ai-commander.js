import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Textarea,
  VStack,
  FormControl,
  FormLabel,
  Text,
  useToast,
  Icon,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
  List,
  ListItem,
  ListIcon as ChakraListIcon, 
  Tag,
  Divider,
  Badge,
  SimpleGrid,
  CircularProgress, // For step execution loading
} from '@chakra-ui/react';
import { 
  FiTerminal, 
  FiSend, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiInfo, 
  FiDollarSign, 
  FiArrowRight, 
  FiArrowLeft, 
  FiArchive, 
  FiEdit3, 
  FiSearch, 
  FiWatch, 
  FiCpu,
  FiTrendingUp,
  FiTrendingDown,
  FiPieChart,
  FiPlayCircle, // For execute button
} from 'react-icons/fi';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext'; // Added
import { useInvestment } from '../../context/InvestmentContext'; // Added
import axios from 'axios';

const AiCommanderPage = () => {
  const { currentUser, getIdToken } = useAuth();
  const { fetchWalletBalance } = useWallet(); // Added
  const { fetchInvestmentAssets, fetchAllExchangeAssets } = useInvestment(); // Added
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const resultsSubtleBg = useColorModeValue("gray.50", "gray.600");

  // State Management
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoadingInterpretation, setIsLoadingInterpretation] = useState(false);
  const [interpretedPlan, setInterpretedPlan] = useState(null); // Will hold the plan including stepStatuses
  const [interpretationError, setInterpretationError] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState(null); // New state
  const [isExecutingStepNumber, setIsExecutingStepNumber] = useState(null); // New state

  const handleUserPromptChange = (event) => {
    setUserPrompt(event.target.value);
    if (interpretationError) setInterpretationError(null);
    if (interpretedPlan) { // Clear everything if prompt changes
        setInterpretedPlan(null);
        setCurrentPlanId(null);
        setIsExecutingStepNumber(null);
    }
  };

  const handleInterpretCommand = async () => {
    if (userPrompt.trim() === '') {
      toast({ title: 'Empty Command', description: 'Please enter a command.', status: 'error', duration: 5000, isClosable: true });
      return;
    }
    if (!currentUser || !getIdToken) {
      toast({ title: 'Authentication Error', description: 'Please log in to use the AI Commander.', status: 'error', duration: 5000, isClosable: true });
      return;
    }

    setIsLoadingInterpretation(true);
    setInterpretationError(null);
    setInterpretedPlan(null);
    setCurrentPlanId(null);
    setIsExecutingStepNumber(null);

    try {
      const token = await getIdToken();
      const response = await axios.post('/api/ai/interpret-command', 
        { userPrompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.interpretedPlan && response.data.planId) {
        // Backend now provides interpretedPlan with stepStatuses initialized
        setInterpretedPlan(response.data.interpretedPlan);
        setCurrentPlanId(response.data.planId);
        toast({ title: 'Command Interpreted Successfully!', description: 'Review the proposed plan below.', status: 'success', duration: 3000, isClosable: true });
      } else {
        throw new Error(response.data.error || 'Failed to get a valid interpretation from the AI.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to interpret command.';
      setInterpretationError(errMsg);
      toast({ title: 'Interpretation Error', description: errMsg, status: 'error', duration: 7000, isClosable: true });
    } finally {
      setIsLoadingInterpretation(false);
    }
  };

  const handleExecuteStep = async (stepNumberToExecute) => {
    if (!currentPlanId || !interpretedPlan) {
        toast({ title: 'Execution Error', description: 'No plan available to execute.', status: 'error' });
        return;
    }
    if (!currentUser || !getIdToken) {
      toast({ title: 'Authentication Error', description: 'Please log in.', status: 'error' });
      return;
    }

    setIsExecutingStepNumber(stepNumberToExecute);
    // No need to clear general interpretationError here, focus on step execution

    try {
        const token = await getIdToken();
        const response = await axios.post('/api/ai/execute-step',
            { planId: currentPlanId, stepNumber: stepNumberToExecute },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
            setInterpretedPlan(prevPlan => {
                const newStepStatuses = prevPlan.stepStatuses.map(status => 
                    status.stepNumber === stepNumberToExecute 
                    ? { ...status, status: response.data.status, mockedResultDetails: response.data.details, errorDetails: null } 
                    : status
                );
                return { ...prevPlan, stepStatuses: newStepStatuses, overallStatus: response.data.overallPlanStatus || prevPlan.overallStatus };
            });
            toast({ title: `Step ${stepNumberToExecute} Simulated`, description: response.data.details || 'Mock execution completed.', status: 'success' });
            
            // Refresh wallet and investment data
            await fetchWalletBalance();
            await fetchInvestmentAssets();
            await fetchAllExchangeAssets(); // If this is available and relevant
        } else {
            throw new Error(response.data.error || `Failed to execute step ${stepNumberToExecute}.`);
        }
    } catch (err) {
        const errMsg = err.response?.data?.error || err.message || `Failed to execute step ${stepNumberToExecute}.`;
        setInterpretedPlan(prevPlan => {
            const newStepStatuses = prevPlan.stepStatuses.map(status => 
                status.stepNumber === stepNumberToExecute 
                ? { ...status, status: 'MOCK_FAILED', errorDetails: errMsg } 
                : status
            );
             // Optionally update overallPlanStatus to FAILED here if needed
            return { ...prevPlan, stepStatuses: newStepStatuses };
        });
        toast({ title: `Step ${stepNumberToExecute} Execution Failed`, description: errMsg, status: 'error' });
    } finally {
        setIsExecutingStepNumber(null);
    }
  };
  
  const getActionIcon = (actionType) => { /* ... (same as before) ... */ };
  const getActionTagColor = (actionType) => { /* ... (same as before) ... */ };
  const formatCurrencyAmount = (amount) => { /* ... (same as before) ... */ };
  
  // Re-define for completeness (these were in previous version)
  const _getActionIcon = (actionType) => {
    switch (actionType?.toUpperCase()) {
      case 'SELL': return FiTrendingDown; case 'BUY': return FiTrendingUp; case 'MOVE_TO_WALLET': return FiArrowRight;
      case 'ALLOCATE_FUNDS': return FiPieChart; case 'HOLD': return FiArchive; case 'CONVERT': return FiRefreshCw;
      case 'ADD_TO_WATCHLIST': return FiWatch; case 'PRICE_ALERT': return FiAlertCircle; case 'RESEARCH': return FiSearch;
      default: return FiCpu;
    }
  };
  const _getActionTagColor = (actionType) => {
    switch (actionType?.toUpperCase()) {
      case 'SELL': return 'red'; case 'BUY': return 'green'; case 'MOVE_TO_WALLET': return 'blue';
      case 'ALLOCATE_FUNDS': return 'purple'; case 'HOLD': return 'gray'; case 'CONVERT': return 'teal';
      case 'ADD_TO_WATCHLIST': return 'yellow'; case 'PRICE_ALERT': return 'orange'; case 'RESEARCH': return 'cyan';
      default: return 'gray';
    }
  };
  const _formatCurrencyAmount = (amount) => (amount == null || isNaN(Number(amount))) ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));


  const getStepStatusColorScheme = (status) => {
    if (status?.includes('COMPLETED')) return 'green';
    if (status?.includes('PENDING')) return 'yellow';
    if (status?.includes('USER_CONFIRMED')) return 'blue';
    if (status?.includes('FAILED')) return 'red';
    if (status?.includes('SIMULATING') || status?.includes('IN_PROGRESS')) return 'purple';
    return 'gray';
  };

  // Determine if a step's execute button should be enabled
  const isStepExecutable = (stepIndex) => {
    if (!interpretedPlan || !interpretedPlan.stepStatuses) return false;
    if (isExecutingStepNumber !== null) return false; // Another step is already executing

    const currentStepStatusObj = interpretedPlan.stepStatuses[stepIndex];
    if (!currentStepStatusObj || !['PENDING_USER_CONFIRMATION', 'MOCK_FAILED'].includes(currentStepStatusObj.status)) {
        return false; // Not in a state to be executed or re-tried
    }

    // Check if all previous steps are MOCK_COMPLETED
    for (let i = 0; i < stepIndex; i++) {
        if (interpretedPlan.stepStatuses[i]?.status !== 'MOCK_COMPLETED') {
            return false;
        }
    }
    return true;
  };


  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }} maxWidth="900px" mx="auto">
        <Heading as="h1" size="xl" mb={8} textAlign="center">
          <Icon as={FiTerminal} mr={3} verticalAlign="middle" />
          AI Financial Commander
        </Heading>

        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor}>
          <VStack spacing={6} align="stretch">
            <FormControl id="userPrompt">
              <FormLabel fontSize="lg" fontWeight="bold">Describe your desired financial actions:</FormLabel>
              <Textarea
                value={userPrompt}
                onChange={handleUserPromptChange}
                placeholder="e.g., Sell all my AAPL stock and use 50% of the proceeds to buy Bitcoin, and put the rest into my USD wallet."
                minRows={4} size="lg" borderColor={borderColor}
                _hover={{ borderColor: useColorModeValue('gray.400', 'gray.500')}}
                _focus={{ borderColor: 'primary.500', boxShadow: `0 0 0 1px var(--chakra-colors-primary-500)`}}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>The AI will attempt to interpret your command into an actionable financial plan.</Text>
            </FormControl>
            <Button colorScheme="primary" leftIcon={<FiSend />} onClick={handleInterpretCommand} isLoading={isLoadingInterpretation} isDisabled={!userPrompt.trim() || isLoadingInterpretation} size="lg" alignSelf="flex-end">
              Interpret Command
            </Button>
          </VStack>
        </Box>

        {/* Results Display Section */}
        <Box mt={8} p={6} bg={cardBg} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor} minH="150px">
          <Heading as="h2" size="lg" mb={4} color={useColorModeValue("gray.600", "gray.300")}>Interpreted Plan</Heading>
          {isLoadingInterpretation && (
            <Flex justifyContent="center" alignItems="center" py={10}><Spinner size="xl" /><Text ml={3}>AI is interpreting your command...</Text></Flex>
          )}
          {interpretationError && !isLoadingInterpretation && (
            <Alert status="error" borderRadius="md"><AlertIcon /><VStack align="start"><Text fontWeight="bold">Interpretation Error:</Text><Text>{interpretationError}</Text></VStack></Alert>
          )}
          {!isLoadingInterpretation && !interpretationError && !interpretedPlan && (
            <Text color="gray.400" textAlign="center" py={10}>The interpreted plan will appear here after you submit a command.</Text>
          )}
          
          {interpretedPlan && !isLoadingInterpretation && !interpretationError && (
             <VStack spacing={6} align="stretch">
                <Box p={3} bg={resultsSubtleBg} borderRadius="md">
                    <Heading size="md" mb={2}>AI's Understanding:</Heading>
                    <Text fontSize="md" whiteSpace="pre-wrap">{interpretedPlan.summary || "No summary provided."}</Text>
                    {interpretedPlan.confidenceScore != null && (
                        <Text fontSize="sm" color="gray.500" mt={2}>
                            Confidence: <Badge colorScheme={interpretedPlan.confidenceScore > 0.7 ? "green" : interpretedPlan.confidenceScore > 0.4 ? "yellow" : "red"} variant="solid" fontSize="0.8em">
                                {Math.round(interpretedPlan.confidenceScore * 100)}%
                            </Badge>
                        </Text>
                    )}
                    {interpretedPlan.overallStatus && (
                        <Text fontSize="sm" color="gray.500" mt={1}>
                            Overall Plan Status: <Tag size="sm" colorScheme={getStepStatusColorScheme(interpretedPlan.overallStatus)}>{interpretedPlan.overallStatus.replace(/_/g, ' ')}</Tag>
                        </Text>
                    )}
                </Box>

                {interpretedPlan.warnings && interpretedPlan.warnings.length > 0 && (
                    <Box p={3} bg={useColorModeValue("orange.50", "orange.800")} borderRadius="md" borderWidth="1px" borderColor="orange.300">
                        <Heading size="md" mb={2} display="flex" alignItems="center"><Icon as={FiAlertCircle} color="orange.500" mr={2}/> Important Considerations:</Heading>
                        <List spacing={2} pl={5} fontSize="sm">
                            {interpretedPlan.warnings.map((warning, index) => (
                                <ListItem key={index} display="flex" alignItems="flex-start"><ChakraListIcon as={FiAlertCircle} color="orange.400" mt="0.2em"/>{warning}</ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                
                <Divider />

                <Box>
                    <Heading size="md" mb={3}>Proposed Action Plan:</Heading>
                    {interpretedPlan.steps && interpretedPlan.steps.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {interpretedPlan.steps.map((step, index) => {
                                const stepStatusInfo = interpretedPlan.stepStatuses?.find(s => s.stepNumber === (step.step || index + 1)) || { status: 'UNKNOWN', mockedResultDetails: null, errorDetails: null };
                                const isExecutingThisStep = isExecutingStepNumber === (step.step || index + 1);
                                const canExecuteThisStep = isStepExecutable(index);

                                return (
                                <Box key={step.step || index} p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor} bg={resultsSubtleBg}>
                                    <Flex justifyContent="space-between" alignItems="center" mb={3}>
                                        <Heading size="sm">Step {step.step || index + 1}</Heading>
                                        <Tag size="md" variant="solid" colorScheme={_getActionTagColor(step.action)}>
                                            <Icon as={_getActionIcon(step.action)} mr={step.action ? 2 : 0} />{step.action || "N/A"}
                                        </Tag>
                                    </Flex>
                                    <SimpleGrid columns={{base:1, md:2}} spacingX={6} spacingY={2} fontSize="sm" mb={3}>
                                        <Text><strong>Asset:</strong> {step.asset?.name || step.asset?.symbol || 'N/A'} <Tag size="sm" variant="outline">{step.asset?.type || 'N/A'}</Tag></Text>
                                        {step.quantity && <Text><strong>Quantity:</strong> {step.quantity}</Text>}
                                        {step.amountUSD != null && <Text><strong>Amount:</strong> {_formatCurrencyAmount(step.amountUSD)}</Text>}
                                        {step.source && <Text><strong>From:</strong> {step.source}</Text>}
                                        {step.destination && <Text><strong>To:</strong> {step.destination}</Text>}
                                        {step.percentageOfProceeds != null && <Text><strong>Allocation:</strong> {step.percentageOfProceeds}% of proceeds</Text>}
                                    </SimpleGrid>
                                    {step.details && <Text mt={2} fontSize="xs" color="gray.500" fontStyle="italic">Details: {step.details}</Text>}
                                    
                                    <Divider my={3}/>
                                    <Flex justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Text fontSize="sm" fontWeight="bold">Status:</Text>
                                            <Tag size="md" colorScheme={getStepStatusColorScheme(stepStatusInfo.status)} mt={1}>
                                                {isExecutingThisStep ? <CircularProgress isIndeterminate size="1.2em" color="whiteAlpha.700" mr={2}/> : null}
                                                {stepStatusInfo.status.replace(/_/g, ' ')}
                                            </Tag>
                                        </Box>
                                        {(stepStatusInfo.status === 'PENDING_USER_CONFIRMATION' || stepStatusInfo.status === 'MOCK_FAILED') && (
                                            <Button 
                                                size="sm" 
                                                colorScheme="green" 
                                                leftIcon={<FiPlayCircle />}
                                                onClick={() => handleExecuteStep(step.step || index + 1)}
                                                isLoading={isExecutingThisStep}
                                                isDisabled={!canExecuteThisStep}
                                            >
                                                {stepStatusInfo.status === 'MOCK_FAILED' ? 'Retry Step (Mock)' : 'Confirm & Execute (Mock)'}
                                            </Button>
                                        )}
                                    </Flex>
                                    {stepStatusInfo.mockedResultDetails && <Text fontSize="xs" color="green.600" mt={2}>Result: {stepStatusInfo.mockedResultDetails}</Text>}
                                    {stepStatusInfo.errorDetails && <Text fontSize="xs" color="red.600" mt={2}>Error: {stepStatusInfo.errorDetails}</Text>}
                                </Box>
                            );
                        })}
                        </VStack>
                    ) : (
                        <Text color="gray.500">No specific action steps were identified by the AI.</Text>
                    )}
                </Box>
             </VStack>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default AiCommanderPage;
