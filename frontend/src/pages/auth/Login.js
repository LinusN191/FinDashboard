import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text,
  Link,
  Alert,
  AlertIcon,
  useColorModeValue,
  VStack,
  HStack,
  Divider,
  Icon,
  Image
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiUser, FiBriefcase, FiUsers } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMode, MODES } from '../../context/ModeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, currentUser } = useAuth();
  const { switchMode } = useMode();
  const navigate = useNavigate();
  
  // UI colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Mode selection cards
  const modeCards = [
    {
      id: MODES.PERSONAL,
      title: 'Personal Finance',
      description: 'Manage your personal finances, investments, and budgets',
      icon: FiUser,
      color: 'blue'
    },
    {
      id: MODES.BUSINESS,
      title: 'Business Finance',
      description: 'Track business transactions, invoices, and financial reports',
      icon: FiBriefcase,
      color: 'green'
    },
    {
      id: MODES.GROUP,
      title: 'Group Investment',
      description: 'Collaborate on group investments and track contributions',
      icon: FiUsers,
      color: 'purple'
    }
  ];
  
  // If user is already logged in, redirect to home page for mode selection
  useEffect(() => {
    if (currentUser) {
      navigate('/home');
    }
  }, [currentUser, navigate]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle mode selection
  const handleModeSelect = (mode) => {
    switchMode(mode);
  };
  
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg={useColorModeValue('gray.50', 'gray.800')}
      p={4}
    >
      <Stack spacing={8} mx="auto" maxW="lg" w={{ base: 'full', md: '500px' }}>
        <Stack align="center">
          <Heading fontSize="3xl" textAlign="center">
            FinDashboard
          </Heading>
          <Text fontSize="md" color={textColor} textAlign="center">
            Complete financial management solution
          </Text>
        </Stack>
        
        <Box
          rounded="lg"
          bg={bgColor}
          boxShadow="lg"
          p={8}
          w="full"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <VStack spacing={4} align="stretch">
            <Heading size="md" mb={2}>
              Choose your mode
            </Heading>
            
            <Stack spacing={3}>
              {modeCards.map((mode) => (
                <Box
                  key={mode.id}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={borderColor}
                  cursor="pointer"
                  onClick={() => handleModeSelect(mode.id)}
                  _hover={{
                    borderColor: `${mode.color}.300`,
                    bg: useColorModeValue(`${mode.color}.50`, `${mode.color}.900`),
                  }}
                  transition="all 0.2s"
                >
                  <HStack>
                    <Flex
                      w="40px"
                      h="40px"
                      align="center"
                      justify="center"
                      borderRadius="full"
                      bg={`${mode.color}.100`}
                      color={`${mode.color}.700`}
                    >
                      <Icon as={mode.icon} w={5} h={5} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">{mode.title}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {mode.description}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </Stack>
            
            <Divider my={4} />
            
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert status="error" mb={4} borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              
              <Stack spacing={4}>
                <FormControl id="email" isRequired>
                  <FormLabel>Email address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormControl>
                
                <FormControl id="password" isRequired>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <InputRightElement width="4.5rem">
                      <Button
                        h="1.75rem"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                
                <Stack spacing={4} pt={2}>
                  <Button
                    loadingText="Logging in"
                    size="lg"
                    bg="blue.400"
                    color="white"
                    _hover={{
                      bg: 'blue.500',
                    }}
                    type="submit"
                    isLoading={loading}
                  >
                    Sign in
                  </Button>
                </Stack>
                
                <Stack direction="row" justify="space-between" pt={2}>
                  <Link as={RouterLink} to="/forgot-password" color="blue.400">
                    Forgot password?
                  </Link>
                  <Link as={RouterLink} to="/signup" color="blue.400">
                    Sign up
                  </Link>
                </Stack>
              </Stack>
            </form>
          </VStack>
        </Box>
      </Stack>
    </Flex>
  );
};

export default Login;
