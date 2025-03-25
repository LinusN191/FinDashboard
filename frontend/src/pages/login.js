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
  Link,
  Stack,
  Text,
  Divider,
  Icon,
  Alert,
  AlertIcon,
  useColorModeValue,
  Badge
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const router = useRouter();
  const { login, loginWithGoogle, loading, error, setError, usingMockAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  
  // Form colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Set default email/password for development
  useEffect(() => {
    if (usingMockAuth) {
      setEmail('dev@example.com');
      setPassword('password123');
    }
  }, [usingMockAuth]);
  
  // Handle email/password login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoginStatus('');
    
    try {
      setLoginStatus('logging-in');
      await login(email, password);
      setLoginStatus('success');
      router.push('/home');
    } catch (err) {
      console.error('Login error:', err);
      setLoginStatus('failed');
    }
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    setError('');
    setLoginStatus('');
    
    try {
      setLoginStatus('logging-in');
      await loginWithGoogle();
      setLoginStatus('success');
      router.push('/home');
    } catch (err) {
      console.error('Google login error:', err);
      setLoginStatus('failed');
    }
  };
  
  return (
    <Flex 
      minH={'100vh'} 
      align={'center'} 
      justify={'center'} 
      bg={useColorModeValue('gray.50', 'gray.800')}
    >
      <Stack spacing={8} mx={'auto'} maxW={'lg'} py={12} px={6} width={{ base: "90%", md: "450px" }}>
        <Stack align={'center'}>
          <Heading fontSize={'4xl'}>Sign in to your account</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to enjoy all of our financial tools 
          </Text>
          {usingMockAuth && (
            <Badge colorScheme="purple" p={2} borderRadius="md">
              Development Mode - Using Mock Authentication
            </Badge>
          )}
        </Stack>
        
        <Box
          rounded={'lg'}
          bg={bgColor}
          boxShadow={'lg'}
          p={8}
        >
          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {loginStatus === 'success' && (
            <Alert status="success" mb={4} borderRadius="md">
              <AlertIcon />
              Login successful! Redirecting to dashboard...
            </Alert>
          )}
          
          <form onSubmit={handleLogin}>
            <Stack spacing={4}>
              <FormControl id="email" isRequired>
                <FormLabel>Email address</FormLabel>
                <InputGroup>
                  <Input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    borderColor={borderColor}
                  />
                </InputGroup>
              </FormControl>
              
              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    borderColor={borderColor}
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon as={showPassword ? FiEyeOff : FiEye} />
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              
              <Stack spacing={5}>
                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  align={'start'}
                  justify={'space-between'}
                >
                  <NextLink href="/forgot-password">
                    <Text as="span" color={'primary.500'}>Forgot password?</Text>
                  </NextLink>
                </Stack>
                
                <Button
                  type="submit"
                  colorScheme={'primary'}
                  isLoading={loginStatus === 'logging-in' && !usingMockAuth}
                  loadingText="Signing in..."
                >
                  Sign in
                </Button>
                
                <Flex align="center">
                  <Divider flex="1" />
                  <Text px={3} color={useColorModeValue('gray.600', 'gray.400')}>OR</Text>
                  <Divider flex="1" />
                </Flex>
                
                <Button
                  w={'full'}
                  variant={'outline'}
                  leftIcon={<Icon as={FcGoogle} />}
                  onClick={handleGoogleLogin}
                  isLoading={loginStatus === 'logging-in'}
                  loadingText="Signing in with Google..."
                >
                  Sign in with Google
                </Button>
              </Stack>
            </Stack>
          </form>
          
          <Stack pt={6}>
            <Text align={'center'}>
              Don't have an account?{' '}
              <NextLink href="/signup">
                <Text as="span" color={'primary.500'}>Sign up</Text>
              </NextLink>
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
};

export default Login;
