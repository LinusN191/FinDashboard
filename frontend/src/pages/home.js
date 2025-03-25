import React from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  Icon,
  VStack,
  useColorModeValue,
  Center,
  Spinner
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { FiUser, FiBriefcase, FiUsers, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useError } from '../context/ErrorContext';
import DashboardLayout from '../components/Layout/DashboardLayout';

const ModeCard = ({ title, description, icon, color, path }) => {
  const router = useRouter();
  
  // Card styling
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  
  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      boxShadow="xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor={`${color}.200`}
      _hover={{
        transform: 'translateY(-5px)',
        boxShadow: '2xl',
        borderColor: `${color}.400`
      }}
      transition="all 0.3s ease"
      position="relative"
      h="100%"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="8px"
        bg={`${color}.500`}
      />
      
      <VStack p={8} spacing={6} align="flex-start" h="100%">
        <Flex
          w="70px"
          h="70px"
          borderRadius="full"
          bg={`${color}.100`}
          color={`${color}.500`}
          justify="center"
          align="center"
        >
          <Icon as={icon} boxSize={8} />
        </Flex>
        
        <VStack align="flex-start" spacing={4}>
          <Heading size="lg">{title}</Heading>
          <Text color={textColor} fontSize="md">
            {description}
          </Text>
        </VStack>
        
        <Box flex="1" />
        
        <NextLink href={path} passHref>
          <Button
            as="a"
            rightIcon={<FiArrowRight />}
            colorScheme={color}
            size="lg"
            w="full"
            mt={4}
          >
            Go to {title}
          </Button>
        </NextLink>
      </VStack>
    </Box>
  );
};

const Home = () => {
  const { currentUser, loading } = useAuth();
  const { createErrorHandler } = useError();
  const handleError = createErrorHandler('HomePage');

  // Mode options data
  const modeOptions = [
    {
      id: 'personal',
      title: 'Personal Finance',
      description: 'Manage your personal finances, budget, expenses, and investments.',
      icon: FiUser,
      color: 'blue',
      path: '/dashboard'
    },
    {
      id: 'business',
      title: 'Business Finance',
      description: 'Track business transactions, invoices, expenses, and generate financial reports.',
      icon: FiBriefcase,
      color: 'green',
      path: '/business'
    },
    {
      id: 'group',
      title: 'Group Investment',
      description: 'Manage group investments, track contributions, and analyze performance.',
      icon: FiUsers,
      color: 'purple',
      path: '/group'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Center h="80vh">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={12}>
        <VStack spacing={8} textAlign="center" mb={12}>
          <Heading size="2xl">Choose Your Finance Mode</Heading>
          <Text fontSize="xl" color={useColorModeValue('gray.600', 'gray.300')} maxW="2xl">
            Select your financial management mode to navigate to the module you want to use
          </Text>
        </VStack>
        
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} px={4}>
          {modeOptions.map((mode) => (
            <ModeCard
              key={mode.id}
              title={mode.title}
              description={mode.description}
              icon={mode.icon}
              color={mode.color}
              path={mode.path}
            />
          ))}
        </SimpleGrid>
      </Container>
    </DashboardLayout>
  );
};

export default Home;
