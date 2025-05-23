import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
  Link as ChakraLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  useColorModeValue,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  List,
  ListItem,
  ListIcon,
  Tag,
  Textarea, // Added for AI Scenario placeholder
} from '@chakra-ui/react';
import { FiPlayCircle, FiTrendingUp, FiBriefcase, FiXCircle, FiMessageSquare, FiInfo, FiUser, FiCpu } from 'react-icons/fi'; // Added FiCpu
import DashboardLayout from '../../../components/Layout/DashboardLayout';
import { useInvestment } from '../../../context/InvestmentContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import PriceChart from '../../../components/Investment/PriceChart';

const SimulationConfigPage = () => {
  const {
    investmentAssets,
    loadingInvestmentAssets,
  } = useInvestment();
  const { currentUser, getIdToken } = useAuth();

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // State Management for form inputs
  const [simulatedAssets, setSimulatedAssets] = useState([]);
  const [timeHorizon, setTimeHorizon] = useState('1_year');
  const [contributionFrequency, setContributionFrequency] = useState('monthly');
  const [contributionAmount, setContributionAmount] = useState('');
  const [marketScenario, setMarketScenario] = useState('average_growth');

  // State for simulation results and AI narrative
  const [simulationResults, setSimulationResults] = useState(null); // Numerical results
  const [aiNarrativeData, setAiNarrativeData] = useState(null); // For AI narratives
  const [profileUsedForNarrativeData, setProfileUsedForNarrativeData] = useState(null); // For profile used
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState(null);
  const [simulationParamsUsed, setSimulationParamsUsed] = useState(null); // To store params for display

  useEffect(() => {
    if (investmentAssets && investmentAssets.length > 0) {
      const initialSimulated = investmentAssets.map(asset => ({
        assetId: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        currentValue: asset.currentValue || 0,
        simulatedAmount: '',
      }));
      setSimulatedAssets(initialSimulated);
    } else {
      setSimulatedAssets([]);
    }
  }, [investmentAssets]);

  const handleSimulatedAmountChange = (assetId, amount) => {
    const numericAmount = parseFloat(amount);
    const valueToSet = amount === '' ? '' : (numericAmount >= 0 ? amount : '0');
    setSimulatedAssets(prevAssets =>
      prevAssets.map(asset =>
        asset.assetId === assetId ? { ...asset, simulatedAmount: valueToSet } : asset
      )
    );
  };
  
  const formatCurrency = (value, withSymbol = true) => {
    if (value == null || isNaN(parseFloat(value))) return 'N/A';
    const options = withSymbol ? { style: 'currency', currency: 'USD' } : { minimumFractionDigits: 2, maximumFractionDigits: 2};
    return new Intl.NumberFormat('en-US', options).format(parseFloat(value));
  };

  const handleRunSimulation = async () => {
    const assetsToSimulate = simulatedAssets.filter(
      asset => parseFloat(asset.simulatedAmount) > 0
    );

    if (assetsToSimulate.length === 0) {
      toast({ title: 'Validation Error', description: 'Please enter a simulated amount for at least one asset.', status: 'error', duration: 5000, isClosable: true });
      return;
    }
    if (contributionFrequency !== 'none' && (contributionAmount === '' || parseFloat(contributionAmount) <= 0)) {
      toast({ title: 'Validation Error', description: 'Please enter a valid contribution amount if frequency is not "None".', status: 'error', duration: 5000, isClosable: true });
      return;
    }

    setIsSimulating(true);
    setSimulationError(null);
    setSimulationResults(null);
    setAiNarrativeData(null); 
    setProfileUsedForNarrativeData(null); 

    const payload = {
      simulatedAssets: assetsToSimulate.map(({ assetId, name, assetType, simulatedAmount }) => ({ assetId, name, assetType, simulatedAmount: parseFloat(simulatedAmount) })),
      timeHorizon,
      contributionFrequency,
      contributionAmount: contributionFrequency !== 'none' ? parseFloat(contributionAmount) : 0,
      marketScenario,
    };
    setSimulationParamsUsed(payload);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Authentication token not available.");

      const response = await axios.post('/api/simulations/run', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.results) {
        setSimulationResults(response.data.results);
        setAiNarrativeData(response.data.aiNarrative || null); 
        setProfileUsedForNarrativeData(response.data.profileUsedForNarrative || null);
        toast({ title: 'Simulation Generated Successfully!', status: 'success', duration: 5000, isClosable: true });
      } else {
        throw new Error(response.data.error || 'Simulation API call succeeded but returned no results.');
      }
    } catch (err) {
      console.error("Simulation API error:", err);
      const errMsg = err.response?.data?.error || err.message || 'An unexpected error occurred during simulation.';
      setSimulationError(errMsg);
      toast({ title: 'Simulation Error', description: errMsg, status: 'error', duration: 7000, isClosable: true });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearResults = () => {
    setSimulationResults(null);
    setSimulationError(null);
    setSimulationParamsUsed(null);
    setAiNarrativeData(null);
    setProfileUsedForNarrativeData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const transformResultsForChart = (results) => {
    if (!results) return [];
    return results.map(item => ({
      time: new Date(item.date).getTime() / 1000, 
      value: item.portfolioValue,
    }));
  };

  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }}>
        <Heading as="h1" size="xl" mb={8} textAlign="center">
          <Icon as={FiTrendingUp} mr={3} verticalAlign="middle" />
          Investment Growth Simulation
        </Heading>

        {/* Portfolio Selection Section */}
        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor} mb={8}>
          <Heading as="h2" size="lg" mb={4}>
             <Icon as={FiBriefcase} mr={2} verticalAlign="middle" />
            Select Assets for Simulation
          </Heading>
          {loadingInvestmentAssets && !currentUser && ( 
             <Flex justifyContent="center" my={10}><Spinner size="xl" /></Flex>
          )}
          {currentUser && loadingInvestmentAssets && investmentAssets.length === 0 && (
            <Flex justifyContent="center" my={10}><Spinner size="xl" /></Flex>
          )}
          {currentUser && !loadingInvestmentAssets && investmentAssets.length === 0 && (
            <Alert status="warning">
              <AlertIcon />
              You have no investments to simulate. Please 
              <NextLink href="/dashboard/investments" passHref>
                <ChakraLink color="blue.500" fontWeight="bold" mx={1}>add some assets</ChakraLink>
              </NextLink> 
              to your portfolio first.
            </Alert>
          )}

          {currentUser && investmentAssets.length > 0 && (
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead>
                  <Tr>
                    <Th>Asset Name</Th>
                    <Th>Type</Th>
                    <Th isNumeric>Current Value</Th>
                    <Th isNumeric>Simulated Amount ($)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {simulatedAssets.map((asset) => (
                    <Tr key={asset.assetId}>
                      <Td fontWeight="medium">{asset.name}</Td>
                      <Td>{asset.assetType}</Td>
                      <Td isNumeric>{formatCurrency(asset.currentValue)}</Td>
                      <Td isNumeric>
                        <Input
                          type="number"
                          value={asset.simulatedAmount}
                          onChange={(e) => handleSimulatedAmountChange(asset.assetId, e.target.value)}
                          placeholder="0.00"
                          textAlign="right"
                          size="sm"
                          min="0"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

        {/* Simulation Parameters Section */}
        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor} mb={8}>
          <Heading as="h2" size="lg" mb={6}>Simulation Parameters</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <FormControl>
              <FormLabel htmlFor="timeHorizon">Time Horizon</FormLabel>
              <Select id="timeHorizon" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)}>
                <option value="6_months">6 Months</option>
                <option value="1_year">1 Year</option>
                <option value="2_years">2 Years</option>
                <option value="3_years">3 Years</option>
                <option value="5_years">5 Years</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="marketScenario">Market Scenario</FormLabel>
              <Select id="marketScenario" value={marketScenario} onChange={(e) => setMarketScenario(e.target.value)}>
                <option value="average_growth">Average Growth</option>
                <option value="recession">Recession Scenario</option>
                <option value="bull_market">Bull Market Scenario</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel htmlFor="contributionFrequency">Contribution Frequency</FormLabel>
              <Select id="contributionFrequency" value={contributionFrequency} onChange={(e) => setContributionFrequency(e.target.value)}>
                <option value="none">None</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </Select>
            </FormControl>

            {contributionFrequency !== 'none' && (
              <FormControl isRequired={contributionFrequency !== 'none'}>
                <FormLabel htmlFor="contributionAmount">Contribution Amount ($)</FormLabel>
                <Input
                  id="contributionAmount"
                  type="number"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
              </FormControl>
            )}
          </SimpleGrid>

          {/* AI Scenario Placeholder */}
          <Box mt={6} pt={4} borderTopWidth="1px" borderColor={borderColor}>
            <FormControl isDisabled={true}>
              <FormLabel htmlFor="aiScenario" display="flex" alignItems="center">
                <Icon as={FiCpu} mr={2} />
                Or, Describe Custom AI Scenario (Future Feature)
              </FormLabel>
              <Textarea
                id="aiScenario"
                placeholder="e.g., 'A moderate recession followed by a slow tech recovery over 3 years...'"
                value=""
                isReadOnly // Ensures it's not editable even if somehow enabled
                bg={useColorModeValue("gray.100", "gray.600")} // Visually distinct disabled style
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Coming soon: Describe your own scenario, and let AI adjust the simulation parameters!
              </Text>
            </FormControl>
          </Box>
        </Box>

        <Flex justifyContent="center">
          <Button
            size="lg"
            colorScheme="primary"
            leftIcon={<FiPlayCircle />}
            onClick={handleRunSimulation}
            isDisabled={loadingInvestmentAssets || investmentAssets.length === 0 || isSimulating}
            isLoading={isSimulating}
            loadingText="Running Simulation"
          >
            Run Simulation
          </Button>
        </Flex>

        {/* Results Display Section */}
        {isSimulating && (
          <Flex justifyContent="center" alignItems="center" my={10} flexDirection="column">
            <Spinner size="xl" />
            <Text mt={4} fontSize="lg">Running simulation, please wait...</Text>
          </Flex>
        )}

        {simulationError && !isSimulating && (
          <Box mt={8} p={6} bg={cardBg} borderRadius="lg" shadow="md" borderWidth="1px" borderColor="red.300">
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <VStack align="start">
                <Text fontWeight="bold">Simulation Failed</Text>
                <Text>{simulationError}</Text>
              </VStack>
            </Alert>
            <Button mt={4} onClick={handleClearResults} colorScheme="red" leftIcon={<FiXCircle />}>
              Clear Error & Try Again
            </Button>
          </Box>
        )}

        {simulationResults && !isSimulating && (
          <Box mt={8} p={6} bg={cardBg} borderRadius="lg" shadow="xl" borderWidth="1px" borderColor={borderColor}>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                 <Heading as="h2" size="xl">Simulation Results</Heading>
                 <Button onClick={handleClearResults} colorScheme="gray" leftIcon={<FiXCircle />}>
                    Clear Results & Start New
                </Button>
            </Flex>
            <Divider my={4} />

            {simulationParamsUsed && (
                <Box mb={6}>
                    <Heading as="h3" size="md" mb={3}>Parameters Used:</Heading>
                    <SimpleGrid columns={{base: 1, md: 2}} spacing={2} fontSize="sm">
                        <Text><strong>Time Horizon:</strong> {simulationParamsUsed.timeHorizon.replace('_', ' ')}</Text>
                        <Text><strong>Market Scenario:</strong> {simulationParamsUsed.marketScenario.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                        <Text><strong>Contribution:</strong> {formatCurrency(simulationParamsUsed.contributionAmount)} {simulationParamsUsed.contributionFrequency.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                        <Text><strong>Initial Portfolio:</strong> {formatCurrency(simulationParamsUsed.simulatedAssets.reduce((sum, asset) => sum + asset.simulatedAmount, 0))}</Text>
                    </SimpleGrid>
                </Box>
            )}
            
            <Heading as="h3" size="lg" mb={4} textAlign="center">Portfolio Growth Over Time</Heading>
            <Box mb={8} minH="400px"> 
                <PriceChart 
                    data={transformResultsForChart(simulationResults)} 
                    chartType="line" 
                    ticker="Simulated Portfolio Value" 
                />
            </Box>
            
            <Divider my={6} />
            <Heading as="h3" size="lg" mb={4}>Summary Statistics</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <Stat p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                    <StatLabel>Initial Investment</StatLabel>
                    <StatNumber>{formatCurrency(simulationParamsUsed?.simulatedAssets.reduce((sum, asset) => sum + asset.simulatedAmount, 0) || 0)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                    <StatLabel>Total Contributions</StatLabel>
                    <StatNumber>{formatCurrency(simulationResults[simulationResults.length - 1].contributions)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                    <StatLabel>Total Gains</StatLabel>
                    <StatNumber color={simulationResults[simulationResults.length - 1].gains >= 0 ? 'green.500' : 'red.500'}>
                        {formatCurrency(simulationResults[simulationResults.length - 1].gains)}
                    </StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor} bg={useColorModeValue('primary.50', 'primary.800')}>
                    <StatLabel fontWeight="bold">Final Portfolio Value</StatLabel>
                    <StatNumber fontSize="2xl" fontWeight="bold">{formatCurrency(simulationResults[simulationResults.length - 1].portfolioValue)}</StatNumber>
                    <StatHelpText>After {simulationParamsUsed?.timeHorizon.replace('_', ' ')}</StatHelpText>
                </Stat>
            </SimpleGrid>

            {/* AI Narrative Section */}
            {aiNarrativeData && (
              <Box mt={8} pt={6} borderTopWidth="1px" borderColor={borderColor}>
                <Heading as="h3" size="xl" mb={6} textAlign="center">
                  <Icon as={FiMessageSquare} mr={2} verticalAlign="middle" />
                  AI-Powered Insights
                </Heading>
                
                {profileUsedForNarrativeData && (
                    <Text fontSize="xs" color="gray.500" mb={4} textAlign="center">
                        <Icon as={FiUser} mr={1} verticalAlign="text-bottom"/>
                        Narrative based on Risk: <Tag size="sm" colorScheme="blue" variant="subtle">{profileUsedForNarrativeData.riskTolerance || 'N/A'}</Tag>, Style: <Tag size="sm" colorScheme="purple" variant="subtle">{(profileUsedForNarrativeData.investmentStyle || ['Not specified']).join(', ') || 'N/A'}</Tag>.
                    </Text>
                )}

                <VStack spacing={5} align="stretch">
                  <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor} bg={useColorModeValue("gray.50", "gray.600")}>
                    <Heading size="md" mb={2}>Overall Summary</Heading>
                    <Text whiteSpace="pre-wrap" fontSize="sm">{aiNarrativeData.summary || "No summary available."}</Text>
                  </Box>
                  <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor} bg={useColorModeValue("gray.50", "gray.600")}>
                    <Heading size="md" mb={2}>Scenario & Your Profile</Heading>
                    <Text whiteSpace="pre-wrap" fontSize="sm">{aiNarrativeData.scenarioImpactAndProfileRelation || "No scenario impact analysis available."}</Text>
                  </Box>
                  <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor} bg={useColorModeValue("gray.50", "gray.600")}>
                    <Heading size="md" mb={2}>Key Takeaways</Heading>
                    {aiNarrativeData.takeaways && typeof aiNarrativeData.takeaways === 'string' && (aiNarrativeData.takeaways.includes('- ') || aiNarrativeData.takeaways.includes('* ') || aiNarrativeData.takeaways.match(/\d\.\s/)) ? (
                        <List spacing={2} fontSize="sm" pl={2}>
                            {aiNarrativeData.takeaways.split('\n').map((item, index) => item.trim() && (
                                <ListItem key={index} display="flex" alignItems="flex-start">
                                    <ListIcon as={FiInfo} color="primary.500" mt="0.2em"/>
                                    {item.replace(/^[-*]\s*|^\d+\.\s*/, '')}
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Text whiteSpace="pre-wrap" fontSize="sm">{aiNarrativeData.takeaways || "No specific takeaways available."}</Text>
                    )}
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default SimulationConfigPage;
