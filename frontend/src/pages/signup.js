import React, { useState } from 'react';
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
  useColorModeValue
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const router = useRouter();
  const { signup, loginWithGoogle, loading, error, setError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState(null);
  
  // Form colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Validate form
  const validateForm = () => {
    if (password !== confirmPassword) {
      setValidationError("Passwords don't match");
      return false;
    }
    
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    
    setValidationError(null);
    return true;
  };
  
  // Handle email/password signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    try {
      await signup(email, password, name);
      router.push('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
    }
  };
  
  // Handle Google signup
  const handleGoogleSignup = async () => {
    setError(null);
    
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err) {
      console.error('Google signup error:', err);
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
          <Heading fontSize={'4xl'}>Create your account</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to start managing your finances ✨
          </Text>
        </Stack>
        
        <Box
          rounded={'lg'}
          bg={bgColor}
          boxShadow={'lg'}
          p={8}
        >
          {(error || validationError) && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error || validationError}
            </Alert>
          )}
          
          <form onSubmit={handleSignup}>
            <Stack spacing={4}>
              <FormControl id="name" isRequired>
                <FormLabel>Full Name</FormLabel>
                <InputGroup>
                  <Input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    borderColor={borderColor}
                  />
                </InputGroup>
              </FormControl>
              
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
                    placeholder="Create a password"
                    borderColor={borderColor}
                  />
                  <InputRightElement h={'full'}>
                    <Button
                      variant={'ghost'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon as={showPassword ? FiEyeOff : FiEye} />
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              
              <FormControl id="confirmPassword" isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    borderColor={borderColor}
                  />
                </InputGroup>
              </FormControl>
              
              <Button
                type="submit"
                colorScheme={'primary'}
                isLoading={loading}
                loadingText="Signing up"
                mt={2}
              >
                Sign up
              </Button>
            </Stack>
          </form>
          
          <Flex align="center" my={4}>
            <Divider />
            <Text px={3} color={useColorModeValue('gray.500', 'gray.400')}>OR</Text>
            <Divider />
          </Flex>
          
          <Button
            w={'full'}
            variant={'outline'}
            leftIcon={<FcGoogle />}
            onClick={handleGoogleSignup}
            isLoading={loading}
          >
            Sign up with Google
          </Button>
          
          <Stack pt={6}>
            <Text align={'center'}>
              Already have an account?{' '}
              <NextLink href="/login">
                <Text as="span" color={'primary.500'}>Sign in</Text>
              </NextLink>
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
};

export default Signup;
