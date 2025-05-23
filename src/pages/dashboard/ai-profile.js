import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  FormControl,
  FormLabel,
  Select,
  CheckboxGroup,
  Checkbox,
  VStack,
  Stack,
  useToast,
  useColorModeValue,
  Icon,
  Switch, // Added
  Input, // Added
  InputGroup, // Added
  InputRightElement, // Added
  Link as ChakraLink, // Added
  Divider, // Added
} from '@chakra-ui/react';
import { FiUserCheck, FiSave, FiCpu, FiEye, FiEyeOff, FiExternalLink, FiKey } from 'react-icons/fi'; // Added more icons
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const AiProfilePage = () => {
  const { currentUser, getIdToken } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const subtleBg = useColorModeValue("gray.50", "gray.600");


  const defaultLlmOverrideState = {
    enabled: false,
    provider: 'openai', // Default for V1
    model: 'gpt-3.5-turbo',
    isUserApiKeySet: false, // From backend, indicates if a key is stored
  };

  const defaultProfileState = {
    riskTolerance: '',
    investmentStyle: [],
    preferredSectors: [],
    llmOverride: { ...defaultLlmOverrideState },
  };

  const [profileData, setProfileData] = useState(defaultProfileState);
  const [userApiKeyInput, setUserApiKeyInput] = useState(''); // For API Key input
  const [showApiKey, setShowApiKey] = useState(false); // For API Key visibility toggle
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const investmentStyleOptions = [
    { label: "Growth", value: "growth" }, { label: "Value", value: "value" }, { label: "Tech Focus", value: "tech" },
    { label: "Green Energy", value: "green_energy" }, { label: "Emerging Markets", value: "emerging_markets" },
    { label: "Dividend Income", value: "dividend_income" }, { label: "Index Investing", value: "index_investing" },
  ];

  const preferredSectorsOptions = [
    { label: "Technology", value: "technology" }, { label: "Healthcare", value: "healthcare" }, { label: "Finance", value: "finance" },
    { label: "Consumer Goods", value: "consumer_goods" }, { label: "Industrials", value: "industrials" },
    { label: "Real Estate", value: "real_estate" }, { label: "Energy", value: "energy" }, { label: "Utilities", value: "utilities" },
  ];
  
  const supportedOpenAiModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];


  const fetchProfile = useCallback(async () => {
    if (!currentUser || !getIdToken) return;
    setIsLoading(true);
    setError(null);
    setUserApiKeyInput(''); // Clear any stale API key input on fetch
    try {
      const token = await getIdToken();
      const response = await axios.get('/api/ai/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ensure llmOverride and its nested fields are initialized from response or defaults
      const fetchedLlmOverride = response.data.llmOverride || {};
      setProfileData({
        riskTolerance: response.data.riskTolerance || '',
        investmentStyle: response.data.investmentStyle || [],
        preferredSectors: response.data.preferredSectors || [],
        llmOverride: { // Merge fetched with defaults to ensure all keys are present
          enabled: fetchedLlmOverride.enabled !== undefined ? fetchedLlmOverride.enabled : defaultLlmOverrideState.enabled,
          provider: fetchedLlmOverride.provider || defaultLlmOverrideState.provider,
          model: fetchedLlmOverride.model || defaultLlmOverrideState.model,
          isUserApiKeySet: fetchedLlmOverride.isUserApiKeySet !== undefined ? fetchedLlmOverride.isUserApiKeySet : defaultLlmOverrideState.isUserApiKeySet,
        },
      });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch AI profile.';
      setError(errMsg);
      toast({ title: 'Error Fetching Profile', description: errMsg, status: 'error', duration: 5000, isClosable: true });
      setProfileData(defaultProfileState); // Reset to default on error
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, getIdToken, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxGroupChange = (name, values) => {
    setProfileData(prev => ({ ...prev, [name]: values }));
  };

  const handleLlmOverrideChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      llmOverride: {
        ...prev.llmOverride,
        [name]: type === 'checkbox' ? checked : value,
      }
    }));
    // If disabling custom LLM, clear the API key input field
    if (name === 'enabled' && !checked) {
      setUserApiKeyInput('');
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !getIdToken) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to save.', status: 'error', duration: 5000, isClosable: true });
        return;
    }
    setIsSaving(true);
    setError(null);

    const payload = {
      riskTolerance: profileData.riskTolerance === '' ? null : profileData.riskTolerance,
      investmentStyle: profileData.investmentStyle,
      preferredSectors: profileData.preferredSectors,
      llmOverride: {
        enabled: profileData.llmOverride.enabled,
        model: profileData.llmOverride.model,
        // Only send apiKey if custom LLM is enabled AND user has entered a new key
        // If enabled but input is empty, it means "keep existing or clear if none/was cleared".
        // The backend handles "apiKey: ''" or "apiKey: null" as a request to clear.
        apiKey: profileData.llmOverride.enabled ? userApiKeyInput : undefined, 
      },
    };
    
    // If custom LLM is disabled, we still send llmOverride.enabled: false
    // If it's enabled, but userApiKeyInput is empty, we send apiKey: '' (or undefined based on above)
    // This allows backend to clear the key if user enabled override but left key blank.
    // If userApiKeyInput is empty and isUserApiKeySet was true, and user wants to keep it, they shouldn't touch the input.
    // If they want to clear it, they enable override and leave input blank (or type then clear).

    try {
      const token = await getIdToken();
      const response = await axios.post('/api/ai/profile', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Re-set profileData with the response from the server to get updated isUserApiKeySet and defaults
      const fetchedLlmOverride = response.data.llmOverride || {};
      setProfileData({
        riskTolerance: response.data.riskTolerance || '',
        investmentStyle: response.data.investmentStyle || [],
        preferredSectors: response.data.preferredSectors || [],
        llmOverride: {
          enabled: fetchedLlmOverride.enabled !== undefined ? fetchedLlmOverride.enabled : defaultLlmOverrideState.enabled,
          provider: fetchedLlmOverride.provider || defaultLlmOverrideState.provider,
          model: fetchedLlmOverride.model || defaultLlmOverrideState.model,
          isUserApiKeySet: fetchedLlmOverride.isUserApiKeySet !== undefined ? fetchedLlmOverride.isUserApiKeySet : defaultLlmOverrideState.isUserApiKeySet,
        },
      });
      setUserApiKeyInput(''); // Clear input field after successful save
      toast({ title: 'AI Profile Saved', description: 'Your preferences have been updated successfully.', status: 'success', duration: 5000, isClosable: true });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to save AI profile.';
      setError(errMsg);
      toast({ title: 'Error Saving Profile', description: errMsg, status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Flex justifyContent="center" alignItems="center" height="calc(100vh - 200px)">
          <Spinner size="xl" />
        </Flex>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }} maxWidth="800px" mx="auto">
        <Heading as="h1" size="xl" mb={8} textAlign="center">
          <Icon as={FiUserCheck} mr={3} verticalAlign="middle" />
          My AI Profile & Preferences
        </Heading>

        {error && !isSaving && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon /> {error}
          </Alert>
        )}

        <VStack spacing={8} align="stretch">
          {/* Standard Profile Section */}
          <Box bg={cardBg} p={6} borderRadius="lg" shadow="base" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={6} align="stretch">
              <FormControl id="riskTolerance">
                <FormLabel fontWeight="bold">Risk Tolerance</FormLabel>
                <Select name="riskTolerance" value={profileData.riskTolerance} onChange={handleInputChange} placeholder="Select your risk tolerance">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>Helps AI tailor suggestions to your comfort level with investment risks.</Text>
              </FormControl>

              <FormControl id="investmentStyle">
                <FormLabel fontWeight="bold">Investment Style(s)</FormLabel>
                <CheckboxGroup colorScheme="primary" value={profileData.investmentStyle} onChange={(values) => handleCheckboxGroupChange('investmentStyle', values)}>
                  <Stack spacing={2} direction={{ base: 'column', md: 'row' }} wrap="wrap">
                    {investmentStyleOptions.map(opt => (<Checkbox key={opt.value} value={opt.value} pr={4}>{opt.label}</Checkbox>))}
                  </Stack>
                </CheckboxGroup>
                <Text fontSize="xs" color="gray.500" mt={1}>Choose styles that best describe your investment approach.</Text>
              </FormControl>

              <FormControl id="preferredSectors">
                <FormLabel fontWeight="bold">Preferred Sectors (Optional)</FormLabel>
                <CheckboxGroup colorScheme="primary" value={profileData.preferredSectors} onChange={(values) => handleCheckboxGroupChange('preferredSectors', values)}>
                  <Stack spacing={2} direction={{ base: 'column', md: 'row' }} wrap="wrap">
                    {preferredSectorsOptions.map(opt => (<Checkbox key={opt.value} value={opt.value} pr={4}>{opt.label}</Checkbox>))}
                  </Stack>
                </CheckboxGroup>
                <Text fontSize="xs" color="gray.500" mt={1}>Indicate any specific market sectors you're interested in.</Text>
              </FormControl>
            </VStack>
          </Box>

          {/* LLM Configuration Section */}
          <Box bg={cardBg} p={6} borderRadius="lg" shadow="base" borderWidth="1px" borderColor={borderColor}>
            <Heading as="h2" size="lg" mb={6} display="flex" alignItems="center">
              <Icon as={FiCpu} mr={3} /> LLM Configuration
            </Heading>
            <VStack spacing={6} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="llm-enabled" mb="0" fontWeight="bold">
                  Use Custom LLM Configuration
                </FormLabel>
                <Switch 
                  id="llm-enabled" 
                  name="enabled"
                  isChecked={profileData.llmOverride.enabled} 
                  onChange={handleLlmOverrideChange}
                  colorScheme="primary"
                />
              </FormControl>

              {profileData.llmOverride.enabled && (
                <>
                  <FormControl id="llmProvider">
                    <FormLabel fontWeight="medium">LLM Provider</FormLabel>
                    <Text p={2} bg={subtleBg} borderRadius="md">{profileData.llmOverride.provider || 'OpenAI'}</Text>
                  </FormControl>

                  <FormControl id="llmModel">
                    <FormLabel fontWeight="medium">OpenAI Model</FormLabel>
                    <Select 
                      name="model" 
                      value={profileData.llmOverride.model || defaultLlmOverrideState.model} 
                      onChange={handleLlmOverrideChange}
                    >
                      {supportedOpenAiModels.map(modelVal => (
                        <option key={modelVal} value={modelVal}>{modelVal.replace('gpt-', 'GPT-')}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl id="llmApiKey">
                    <FormLabel fontWeight="medium">Your OpenAI API Key</FormLabel>
                    {profileData.llmOverride.isUserApiKeySet && !userApiKeyInput && (
                       <Flex align="center" justify="space-between" p={2} bg={subtleBg} borderRadius="md" mb={2}>
                         <Text fontSize="sm" color="green.500"><Icon as={FiCheckCircle} mr={2} />API Key is set and active.</Text>
                         <Button size="xs" variant="link" colorScheme="blue" onClick={() => setUserApiKeyInput(' ')}>Replace Key</Button>
                       </Flex>
                    )}
                     {(userApiKeyInput || !profileData.llmOverride.isUserApiKeySet) && (
                        <InputGroup size="md">
                        <Input
                            name="apiKey" // Not directly used by handleLlmOverrideChange, but good practice
                            type={showApiKey ? 'text' : 'password'}
                            value={userApiKeyInput === ' ' ? '' : userApiKeyInput} // Handle the space trick to show input
                            onChange={(e) => setUserApiKeyInput(e.target.value)}
                            placeholder="Enter your OpenAI API Key (e.g., sk-...)"
                        />
                        <InputRightElement width="4.5rem">
                            <IconButton 
                            h="1.75rem" 
                            size="sm" 
                            onClick={() => setShowApiKey(!showApiKey)}
                            icon={showApiKey ? <FiEyeOff /> : <FiEye />}
                            aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                            />
                        </InputRightElement>
                        </InputGroup>
                     )}
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Your API key is stored securely encrypted. You are responsible for any costs incurred on your OpenAI account.
                      <ChakraLink href="https://platform.openai.com/api-keys" isExternal color="blue.500" ml={1}>
                        Get your key <Icon as={FiExternalLink} mx="2px" />
                      </ChakraLink>
                    </Text>
                    {userApiKeyInput && (
                        <Text fontSize="xs" color="orange.500" mt={1}>
                            <Icon as={FiKey} mr={1}/>
                            Saving will overwrite any existing key. Leave blank to keep existing key (if set) or to clear the key if "API Key is set" message is not showing.
                        </Text>
                    )}
                  </FormControl>
                </>
              )}
            </VStack>
          </Box>

          <Flex justifyContent="flex-end" mt={4}>
            <Button
              colorScheme="primary"
              leftIcon={<FiSave />}
              onClick={handleSaveProfile}
              isLoading={isSaving}
              isDisabled={isLoading}
            >
              Save All Preferences
            </Button>
          </Flex>
        </VStack>
      </Box>
    </DashboardLayout>
  );
};

export default AiProfilePage;
