import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Icon,
  Flex,
  useColorModeValue,
  Button,
  Container,
  useToast
} from '@chakra-ui/react';
import { FiUser, FiBriefcase, FiUsers, FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Head from 'next/head';

const ModeSelector = () => {
  const router = useRouter();
  const toast = useToast();
  const [selectedMode, setSelectedMode] = useState(null);
  
  // Cards background colors
  const cardBg = useColorModeValue('white', 'gray.700');
  
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
  
  const handleModeSelect = (mode) => {
    // Save selected mode to localStorage
    localStorage.setItem('appMode', mode.id);
    setSelectedMode(mode.id);
    
    // Show toast notification
    toast({
      title: `${mode.title} selected`,
      description: `Redirecting to ${mode.title} dashboard...`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    
    // Navigate to the selected mode dashboard
    setTimeout(() => {
      router.push(mode.path);
    }, 500);
  };
  
  return (
    <>
      <Head>
        <title>FinDashboard - Select Mode</title>
      </Head>
      <Container maxW="container.xl" centerContent>
        <Box py={10} w="full">
          <VStack spacing={8} textAlign="center" mb={10}>
            <Heading size="2xl">FinDashboard</Heading>
            <Text fontSize="xl">Select your financial management mode</Text>
          </VStack>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} px={4}>
            {modeOptions.map((mode) => (
              <Box
                key={mode.id}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="lg"
                overflow="hidden"
                borderWidth="1px"
                borderColor={`${mode.color}.200`}
                _hover={{
                  transform: 'translateY(-5px)',
                  boxShadow: 'xl',
                  borderColor: `${mode.color}.400`
                }}
                transition="all 0.3s ease"
                cursor="pointer"
                position="relative"
                h="100%"
                onClick={() => handleModeSelect(mode)}
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
                    w="60px"
                    h="60px"
                    borderRadius="full"
                    bg={`${mode.color}.100`}
                    color={`${mode.color}.500`}
                    justify="center"
                    align="center"
                  >
                    <Icon as={mode.icon} boxSize={6} />
                  </Flex>
                  
                  <VStack align="flex-start" spacing={3}>
                    <Heading size="lg">{mode.title}</Heading>
                    <Text color={useColorModeValue('gray.600', 'gray.300')}>
                      {mode.description}
                    </Text>
                  </VStack>
                  
                  <Button
                    rightIcon={<FiArrowRight />}
                    colorScheme={mode.color}
                    variant={selectedMode === mode.id ? "solid" : "outline"}
                    size="lg"
                    w="full"
                    mt="auto"
                  >
                    Select {mode.title}
                  </Button>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Container>
    </>
  );
};

export default ModeSelector;
