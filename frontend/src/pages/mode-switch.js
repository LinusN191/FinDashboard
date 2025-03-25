import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Icon,
  VStack,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import { FiUser, FiBriefcase, FiUsers, FiArrowRight } from 'react-icons/fi';
import NextLink from 'next/link';
import Head from 'next/head';

const ModeSwitch = () => {
  // Cards background colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  
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

  return (
    <>
      <Head>
        <title>FinDashboard - Switch Mode</title>
      </Head>
      
      <Container maxW="container.xl" py={12}>
        <VStack spacing={8} textAlign="center" mb={12}>
          <Heading size="2xl">FinDashboard</Heading>
          <Text fontSize="xl" color={textColor} maxW="2xl">
            Select your financial management mode to navigate to the module you want to use
          </Text>
        </VStack>
        
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} px={4}>
          {modeOptions.map((mode) => (
            <Box
              key={mode.id}
              bg={cardBg}
              borderRadius="lg"
              boxShadow="xl"
              overflow="hidden"
              borderWidth="1px"
              borderColor={`${mode.color}.200`}
              _hover={{
                transform: 'translateY(-5px)',
                boxShadow: '2xl',
                borderColor: `${mode.color}.400`
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
                bg={`${mode.color}.500`}
              />
              
              <VStack p={8} spacing={6} align="flex-start" h="100%">
                <Flex
                  w="70px"
                  h="70px"
                  borderRadius="full"
                  bg={`${mode.color}.100`}
                  color={`${mode.color}.500`}
                  justify="center"
                  align="center"
                >
                  <Icon as={mode.icon} boxSize={8} />
                </Flex>
                
                <VStack align="flex-start" spacing={4}>
                  <Heading size="lg">{mode.title}</Heading>
                  <Text color={textColor} fontSize="md">
                    {mode.description}
                  </Text>
                </VStack>
                
                <Box flex="1" />
                
                <NextLink href={mode.path} passHref>
                  <Button
                    as="a"
                    rightIcon={<FiArrowRight />}
                    colorScheme={mode.color}
                    size="lg"
                    w="full"
                    mt={4}
                  >
                    Go to {mode.title}
                  </Button>
                </NextLink>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </>
  );
};

export default ModeSwitch;
