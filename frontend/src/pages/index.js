import React from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  Image,
  SimpleGrid,
  Icon,
  HStack,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { FiBarChart2, FiDollarSign, FiPieChart, FiTarget, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Feature = ({ title, text, icon }) => {
  return (
    <Stack 
      direction={'row'} 
      align={'center'} 
      bg={useColorModeValue('white', 'gray.700')} 
      rounded={'lg'} 
      p={6} 
      boxShadow={'md'}
    >
      <Flex
        w={16}
        h={16}
        align={'center'}
        justify={'center'}
        color={'white'}
        rounded={'full'}
        bg={'primary.500'}
        mb={1}
      >
        {icon}
      </Flex>
      <Stack direction={'column'} spacing={1} ml={4}>
        <Heading fontSize={'xl'}>{title}</Heading>
        <Text color={useColorModeValue('gray.600', 'gray.300')}>{text}</Text>
      </Stack>
    </Stack>
  );
};

const Testimonial = ({ content, author, position }) => {
  return (
    <Box
      px={8}
      py={10}
      rounded={'xl'}
      bg={useColorModeValue('white', 'gray.700')}
      boxShadow={'lg'}
    >
      <Text 
        fontSize={'lg'} 
        mb={4}
        color={useColorModeValue('gray.700', 'white')}
        fontStyle={'italic'}
      >
        "{content}"
      </Text>
      <HStack align={'center'}>
        <Box h={10} w={10} rounded={'full'} bg={'gray.300'} />
        <VStack align={'start'} spacing={0}>
          <Text fontWeight={600}>{author}</Text>
          <Text fontSize={'sm'} color={useColorModeValue('gray.500', 'gray.400')}>
            {position}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
};

const Home = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/signup');
    }
  };

  return (
    <Box>
      {/* Navigation */}
      <Box as="nav" py={4} px={8} borderBottom={1} borderStyle={'solid'} borderColor={useColorModeValue('gray.200', 'gray.700')}>
        <Flex justify={'space-between'} align={'center'} maxW={'7xl'} mx={'auto'}>
          <Heading as="h1" size="lg" color={'primary.500'}>FinDashboard</Heading>
          <HStack spacing={8}>
            {user ? (
              <NextLink href="/dashboard" passHref>
                <Button colorScheme="primary" variant="solid">
                  Dashboard
                </Button>
              </NextLink>
            ) : (
              <>
                <NextLink href="/login" passHref>
                  <Button variant="ghost">
                    Login
                  </Button>
                </NextLink>
                <NextLink href="/signup" passHref>
                  <Button colorScheme="primary" variant="solid">
                    Sign Up
                  </Button>
                </NextLink>
              </>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Hero Section */}
      <Box bg={useColorModeValue('gray.50', 'gray.900')}>
        <Container maxW={'7xl'} py={16}>
          <Stack 
            align={'center'} 
            spacing={{ base: 8, md: 10 }} 
            direction={{ base: 'column', md: 'row' }}
          >
            <Stack flex={1} spacing={{ base: 5, md: 10 }}>
              <Heading
                lineHeight={1.1}
                fontWeight={600}
                fontSize={{ base: '3xl', sm: '4xl', lg: '6xl' }}
              >
                <Text
                  as={'span'}
                  position={'relative'}
                  color={'primary.500'}
                >
                  Your Finance,
                </Text>
                <br />
                <Text as={'span'} color={useColorModeValue('gray.800', 'white')}>
                  Simplified
                </Text>
              </Heading>
              <Text color={useColorModeValue('gray.600', 'gray.300')} fontSize={'xl'}>
                A comprehensive dashboard for managing your investments and personal finances all in one place. 
                Track your spending, monitor your investments, and achieve your financial goals with ease.
              </Text>
              <Stack
                spacing={{ base: 4, sm: 6 }}
                direction={{ base: 'column', sm: 'row' }}
              >
                <Button
                  rounded={'full'}
                  size={'lg'}
                  fontWeight={'normal'}
                  px={6}
                  colorScheme={'primary'}
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
                <Button
                  rounded={'full'}
                  size={'lg'}
                  fontWeight={'normal'}
                  px={6}
                  leftIcon={<FiBarChart2 />}
                >
                  Take a Tour
                </Button>
              </Stack>
            </Stack>
            <Flex
              flex={1}
              justify={'center'}
              align={'center'}
              position={'relative'}
            >
              <Box
                position={'relative'}
                height={'400px'}
                width={'full'}
                rounded={'2xl'}
                boxShadow={'2xl'}
                overflow={'hidden'}
              >
                <Image
                  alt={'Dashboard Preview'}
                  fit={'cover'}
                  align={'center'}
                  w={'100%'}
                  h={'100%'}
                  src={'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80'}
                />
              </Box>
            </Flex>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Box py={16}>
        <Container maxW={'7xl'}>
          <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
            <Heading fontSize={'4xl'}>All-in-One Financial Dashboard</Heading>
            <Text color={useColorModeValue('gray.600', 'gray.300')} fontSize={'xl'}>
              Everything you need to manage your financial life in one place.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
            <Feature
              icon={<Icon as={FiBarChart2} w={10} h={10} />}
              title={'Investment Analytics'}
              text={'Track your investments with real-time data, advanced charts, and performance metrics.'}
            />
            <Feature
              icon={<Icon as={FiDollarSign} w={10} h={10} />}
              title={'Expense Tracking'}
              text={'Monitor your spending patterns and identify opportunities to save.'}
            />
            <Feature
              icon={<Icon as={FiPieChart} w={10} h={10} />}
              title={'Budget Management'}
              text={'Create and manage budgets to help you stay on track with your financial goals.'}
            />
            <Feature
              icon={<Icon as={FiTarget} w={10} h={10} />}
              title={'Goal Setting'}
              text={'Set and track financial goals with personalized recommendations.'}
            />
            <Feature
              icon={<Icon as={FiShield} w={10} h={10} />}
              title={'Debt Management'}
              text={'Track your debts and accelerate your journey to financial freedom.'}
            />
            <Feature
              icon={<Icon as={FiBarChart2} w={10} h={10} />}
              title={'AI-Powered Insights'}
              text={'Get personalized financial insights and recommendations based on your data.'}
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Box bg={useColorModeValue('gray.50', 'gray.900')} py={16}>
        <Container maxW={'7xl'}>
          <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'} mb={16}>
            <Heading fontSize={'4xl'}>Loved by Users</Heading>
            <Text color={useColorModeValue('gray.600', 'gray.300')} fontSize={'xl'}>
              See what others are saying about FinDashboard
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
            <Testimonial 
              content="FinDashboard has completely changed how I manage my money. I can now see all my finances in one place and make better decisions."
              author="Sarah Johnson"
              position="Marketing Executive"
            />
            <Testimonial 
              content="I've tried many finance apps, but this one truly stands out. The investment analytics are powerful yet easy to understand."
              author="Michael Chen"
              position="Software Engineer"
            />
            <Testimonial 
              content="The debt payoff planning tool helped me create a strategy to become debt-free. I'm now on track to pay off my loans two years earlier than expected!"
              author="Jessica Williams"
              position="Teacher"
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA */}
      <Box py={16}>
        <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'}>
          <Heading fontSize={'4xl'}>Start Your Financial Journey Today</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')} fontSize={'xl'}>
            Join thousands of users who've taken control of their finances with FinDashboard.
          </Text>
          <Stack
            direction={'column'}
            spacing={3}
            align={'center'}
            alignSelf={'center'}
            position={'relative'}
            mt={8}
          >
            <Button
              colorScheme={'primary'}
              rounded={'full'}
              px={6}
              py={6}
              fontSize={'lg'}
              onClick={handleGetStarted}
            >
              {user ? 'Go to Dashboard' : 'Sign Up for Free'}
            </Button>
            <Text fontSize={'sm'} color={useColorModeValue('gray.500', 'gray.400')}>
              No credit card required
            </Text>
          </Stack>
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        bg={useColorModeValue('gray.50', 'gray.900')}
        color={useColorModeValue('gray.700', 'gray.200')}
        borderTop={1}
        borderStyle={'solid'}
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <Container
          as={Stack}
          maxW={'7xl'}
          py={10}
          direction={{ base: 'column', md: 'row' }}
          spacing={4}
          justify={{ base: 'center', md: 'space-between' }}
          align={{ base: 'center', md: 'center' }}
        >
          <Text> 2024 FinDashboard. All rights reserved</Text>
          <Stack direction={'row'} spacing={6}>
            <NextLink href="/terms" passHref>
              <Button variant="link">Terms</Button>
            </NextLink>
            <NextLink href="/privacy" passHref>
              <Button variant="link">Privacy</Button>
            </NextLink>
            <NextLink href="/contact" passHref>
              <Button variant="link">Contact</Button>
            </NextLink>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
