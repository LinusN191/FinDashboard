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
  Input,
  VStack,
  useToast,
  useColorModeValue,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  Link as ChakraLink,
  List,
  ListItem,
  ListIcon,
  Checkbox, // Added
  AlertDescription, // Added
  AlertTitle, // Added
} from '@chakra-ui/react';
import { FiPlusCircle, FiLink, FiUnlink, FiInfo, FiExternalLink, FiAlertTriangle } from 'react-icons/fi';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const ExchangeConnectionsPage = () => {
  const { currentUser, getIdToken } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // State Management
  const [connections, setConnections] = useState([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [exchangeName, setExchangeName] = useState('binance'); // Default for V1
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [canTrade, setCanTrade] = useState(false); // New state for trading permissions checkbox
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(null); 
  const [error, setError] = useState(null);

  // Fetch Existing Connections
  const fetchConnections = useCallback(async () => {
    if (!currentUser || !getIdToken) return;
    setIsLoadingConnections(true);
    setError(null);
    try {
      const token = await getIdToken();
      const response = await axios.get('/api/exchanges/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnections(response.data);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch connections.';
      setError(errMsg);
    } finally {
      setIsLoadingConnections(false);
    }
  }, [currentUser, getIdToken]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Add New Connection
  const handleConnectExchange = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast({ title: 'Missing Fields', description: 'API Key and API Secret are required.', status: 'error', duration: 5000, isClosable: true });
      return;
    }
    if (!currentUser || !getIdToken) {
        toast({ title: 'Authentication Error', description: 'User not authenticated.', status: 'error', duration: 5000, isClosable: true });
        return;
    }

    setIsConnecting(true);
    setError(null);
    try {
      const token = await getIdToken();
      // Include canTrade in the payload
      const payload = { exchangeName, apiKey, apiSecret, canTrade }; 
      await axios.post('/api/exchanges/connect', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Connection Successful', description: `${exchangeName.toUpperCase()} API keys connected. ${canTrade ? 'Trading enabled.' : ''}`, status: 'success', duration: 5000, isClosable: true });
      setApiKey('');
      setApiSecret('');
      setCanTrade(false); // Reset checkbox
      fetchConnections(); 
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || `Failed to connect ${exchangeName}.`;
      setError(errMsg); 
      toast({ title: 'Connection Failed', description: errMsg, status: 'error', duration: 7000, isClosable: true });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Exchange
  const handleDisconnect = async (connectionId) => {
     if (!currentUser || !getIdToken) {
        toast({ title: 'Authentication Error', description: 'User not authenticated.', status: 'error', duration: 5000, isClosable: true });
        return;
    }
    setIsDisconnecting(connectionId);
    setError(null);
    try {
      const token = await getIdToken();
      await axios.post('/api/exchanges/disconnect', { connectionId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Disconnected', description: 'Exchange connection removed successfully.', status: 'success', duration: 5000, isClosable: true });
      fetchConnections(); 
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to disconnect exchange.';
      setError(errMsg);
      toast({ title: 'Disconnection Failed', description: errMsg, status: 'error', duration: 7000, isClosable: true });
    } finally {
      setIsDisconnecting(null);
    }
  };
  
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }}>
        <Heading as="h1" size="xl" mb={8} textAlign="center">
          <Icon as={FiLink} mr={3} verticalAlign="middle" />
          Manage Your Exchange API Connections
        </Heading>

        {/* Add New Connection Section */}
        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor} mb={10}>
          <Heading as="h2" size="lg" mb={6}>Connect New Exchange</Heading>
          <VStack spacing={5} align="stretch">
            <FormControl id="exchangeName">
              <FormLabel>Exchange Name</FormLabel>
              <Input type="text" value="Binance" isReadOnly isDisabled bg={useColorModeValue("gray.100", "gray.600")} />
              <Text fontSize="xs" color="gray.500" mt={1}>Currently, only Binance is supported (V1).</Text>
            </FormControl>

            <FormControl id="apiKey" isRequired>
              <FormLabel>API Key</FormLabel>
              <Input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Binance API Key"
              />
            </FormControl>

            <FormControl id="apiSecret" isRequired>
              <FormLabel>API Secret</FormLabel>
              <Input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter your Binance API Secret"
              />
            </FormControl>

            {/* Trading Permissions Checkbox and Warning */}
            <FormControl id="canTrade">
                <Checkbox isChecked={canTrade} onChange={(e) => setCanTrade(e.target.checked)}>
                    This API key has Trading Permissions
                </Checkbox>
            </FormControl>

            {canTrade && (
                <Alert status="warning" borderRadius="md" mt={2}>
                    <AlertIcon as={FiAlertTriangle} />
                    <Box flex="1">
                        <AlertTitle fontWeight="bold">High Risk: Trading Permissions Enabled!</AlertTitle>
                        <AlertDescription display="block" fontSize="sm">
                            <List spacing={1} mt={1}>
                                <ListItem>Ensure this API key is restricted on the exchange (e.g., no withdrawal rights, IP restrictions if possible).</ListItem>
                                <ListItem>You are responsible for all actions performed using this key.</ListItem>
                                <ListItem>For V1, actions are deeply mocked and no real trades will occur, but this permission will be used for future live trading features.</ListItem>
                            </List>
                        </AlertDescription>
                    </Box>
                </Alert>
            )}
            
            <Box py={2}>
                <Text fontWeight="bold" mb={1}>Important Security Instructions:</Text>
                <List spacing={1} fontSize="sm">
                    <ListItem><ListIcon as={FiInfo} color="blue.500" />Always create API keys with **read-only permissions** if you only intend to track assets without trading.</ListItem>
                    <ListItem><ListIcon as={FiInfo} color="blue.500" />Restrict API key access to trusted IP addresses if your exchange supports it.</ListItem>
                    <ListItem><ListIcon as={FiInfo} color="blue.500" />Never share your API keys with anyone. This platform encrypts them for storage.</ListItem>
                </List>
                 <ChakraLink href="https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072" isExternal color="blue.500" fontSize="sm" mt={2}>
                    How to create API keys on Binance <Icon as={FiExternalLink} mx="2px" />
                </ChakraLink>
            </Box>

            <Button
              colorScheme="primary"
              leftIcon={<FiPlusCircle />}
              onClick={handleConnectExchange}
              isLoading={isConnecting}
              isDisabled={isConnecting || !apiKey || !apiSecret}
              size="lg"
            >
              Connect Exchange
            </Button>
            {error && !isConnecting && (
                <Alert status="error" mt={3} borderRadius="md">
                    <AlertIcon /> {error}
                </Alert>
            )}
          </VStack>
        </Box>

        {/* Connected Exchanges List Section */}
        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor}>
          <Heading as="h2" size="lg" mb={6}>Your Connected Exchanges</Heading>
          {isLoadingConnections && <Flex justifyContent="center" py={10}><Spinner size="xl" /></Flex>}
          
          {!isLoadingConnections && error && connections.length === 0 && (
             <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>
          )}

          {!isLoadingConnections && !error && connections.length === 0 && (
            <Text textAlign="center" py={10} color="gray.500">No exchanges connected yet.</Text>
          )}

          {connections.length > 0 && (
            <Table variant="simple" size="md">
              <Thead>
                <Tr>
                  <Th>Exchange</Th>
                  <Th>API Key (Partial)</Th>
                  <Th>Permissions</Th> {/* Updated Column */}
                  <Th>Status</Th>
                  <Th>Connected On</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {connections.map((conn) => (
                  <Tr key={conn.id}>
                    <Td textTransform="capitalize">{conn.exchangeName}</Td>
                    <Td fontFamily="monospace">{conn.apiKeyPublicPart || 'N/A'}</Td>
                    <Td>
                      <Tag size="sm" colorScheme={conn.canTrade ? "orange" : "blue"} variant="subtle">
                        {conn.canTrade ? "Trading Enabled" : "Read-Only"}
                      </Tag>
                    </Td>
                    <Td>
                      <Tag colorScheme={conn.status === 'active' ? 'green' : 'red'} size="sm">
                        {conn.status}
                      </Tag>
                    </Td>
                    <Td>{formatDate(conn.createdAt)}</Td>
                    <Td>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        leftIcon={<FiUnlink />}
                        onClick={() => handleDisconnect(conn.id)}
                        isLoading={isDisconnecting === conn.id}
                        isDisabled={isDisconnecting !== null && isDisconnecting !== conn.id}
                      >
                        Disconnect
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default ExchangeConnectionsPage;
