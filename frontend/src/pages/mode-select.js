import React, { useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Icon,
  Flex,
  useColorModeValue,
  Container,
  Button
} from '@chakra-ui/react';
import { FiUser, FiBriefcase, FiUsers, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useMode, MODES } from '../context/ModeContext';

const ModeSelectPage = () => {
  const { switchMode, currentMode } = useMode();
  const navigate = useNavigate();
  
  // Cards background colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');
  
  // Mode options data
  const modeOptions = [
    {
      id: MODES.PERSONAL,
      title: 'Personal Finance',
      description: 'Manage your personal finances, budget, expenses, and investments.',
      icon: FiUser,
      color: 'blue',
      path: '/dashboard'
    },
    {
      id: MODES.BUSINESS,
      title: 'Business Finance',
      description: 'Track business transactions, invoices, expenses, and generate financial reports.',
      icon: FiBriefcase,
      color: 'green',
      path: '/business'
    },
    {
      id: MODES.GROUP,
      title: 'Group Investment',
      description: 'Manage group investments, track contributions, and analyze performance.',
      icon: FiUsers,
      color: 'purple',
      path: '/group'
    }
  ];
  
  const handleSelectMode = (mode, path) => {
    switchMode(mode);
    navigate(path);
  };
  
  return (
    <Box minH="100vh" py={10} bg={useColorModeValue('gray.50', 'gray.800')}>
      <Container maxW="container.xl">
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
              onClick={() => handleSelectMode(mode.id, mode.path)}
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
                
                <Spacer />
                
                <Button
                  rightIcon={<FiArrowRight />}
                  colorScheme={mode.color}
                  variant="outline"
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
      </Container>
    </Box>
  );
};

// Import Spacer
const Spacer = () => <Box flex={1} />;

export default ModeSelectPage;
