import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Flex,
  Text,
  Icon,
  Link,
  Divider,
  useColorModeValue,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiDollarSign, 
  FiPieChart, 
  FiBarChart2, 
  FiTrendingUp,
  FiBriefcase,
  FiUsers,
  FiFileText,
  FiCreditCard,
  FiActivity,
  FiSettings,
  FiTarget
} from 'react-icons/fi';
import { useMode, MODES } from '../../context/ModeContext';
import ModeSelector from '../ModeSelector';

// Nav Item component
const NavItem = ({ icon, children, to, isActive }) => {
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.700', 'blue.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Link
      as={NavLink}
      to={to}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
    >
      <Flex
        align="center"
        p="3"
        mx="2"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : undefined}
        _hover={{
          bg: isActive ? activeBg : hoverBg,
        }}
      >
        {icon && (
          <Icon
            mr="3"
            fontSize="16"
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  );
};

// Navigation Section
const NavSection = ({ title, children }) => {
  const textColor = useColorModeValue('gray.600', 'gray.400');
  
  return (
    <Box my={4}>
      <Text
        px={4}
        mb={2}
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        color={textColor}
      >
        {title}
      </Text>
      <VStack spacing={1} align="stretch">
        {children}
      </VStack>
    </Box>
  );
};

const AppSidebar = () => {
  const { currentMode } = useMode();
  const location = useLocation();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check if a route is active
  const isRouteActive = (path) => {
    return location.pathname === path;
  };
  
  // Personal Mode Navigation Items
  const PersonalNavItems = () => (
    <>
      <NavSection title="Personal Finance">
        <NavItem icon={FiHome} to="/home" isActive={isRouteActive('/home')}>
          Home
        </NavItem>
        <NavItem icon={FiDollarSign} to="/transactions" isActive={isRouteActive('/transactions')}>
          Transactions
        </NavItem>
        <NavItem icon={FiPieChart} to="/budget" isActive={isRouteActive('/budget')}>
          Budget
        </NavItem>
        <NavItem icon={FiBarChart2} to="/expenses" isActive={isRouteActive('/expenses')}>
          Expenses
        </NavItem>
        <NavItem icon={FiCreditCard} to="/accounts" isActive={isRouteActive('/accounts')}>
          Accounts
        </NavItem>
      </NavSection>
      
      <NavSection title="Investments">
        <NavItem icon={FiTrendingUp} to="/investments" isActive={isRouteActive('/investments')}>
          Portfolio
        </NavItem>
        <NavItem icon={FiActivity} to="/trading" isActive={isRouteActive('/trading')}>
          Trading
        </NavItem>
        <NavItem icon={FiTarget} to="/goals" isActive={isRouteActive('/goals')}>
          Goals
        </NavItem>
      </NavSection>
    </>
  );
  
  // Business Mode Navigation Items
  const BusinessNavItems = () => (
    <>
      <NavSection title="Business Finance">
        <NavItem icon={FiHome} to="/home" isActive={isRouteActive('/home')}>
          Home
        </NavItem>
        <NavItem icon={FiDollarSign} to="/business/transactions" isActive={isRouteActive('/business/transactions')}>
          Transactions
        </NavItem>
        <NavItem icon={FiFileText} to="/business/invoices" isActive={isRouteActive('/business/invoices')}>
          Invoices
        </NavItem>
        <NavItem icon={FiBarChart2} to="/business/expenses" isActive={isRouteActive('/business/expenses')}>
          Expenses
        </NavItem>
        <NavItem icon={FiPieChart} to="/business/reports" isActive={isRouteActive('/business/reports')}>
          Reports
        </NavItem>
      </NavSection>
      
      <NavSection title="Business Management">
        <NavItem icon={FiBriefcase} to="/business/entities" isActive={isRouteActive('/business/entities')}>
          Entities
        </NavItem>
        <NavItem icon={FiUsers} to="/business/clients" isActive={isRouteActive('/business/clients')}>
          Clients
        </NavItem>
        <NavItem icon={FiTarget} to="/business/goals" isActive={isRouteActive('/business/goals')}>
          Goals
        </NavItem>
      </NavSection>
    </>
  );
  
  // Group Mode Navigation Items
  const GroupNavItems = () => (
    <>
      <NavSection title="Group Investment">
        <NavItem icon={FiHome} to="/home" isActive={isRouteActive('/home')}>
          Home
        </NavItem>
        <NavItem icon={FiUsers} to="/group/members" isActive={isRouteActive('/group/members')}>
          Members
        </NavItem>
        <NavItem icon={FiDollarSign} to="/group/contributions" isActive={isRouteActive('/group/contributions')}>
          Contributions
        </NavItem>
        <NavItem icon={FiPieChart} to="/group/investments" isActive={isRouteActive('/group/investments')}>
          Investments
        </NavItem>
        <NavItem icon={FiBarChart2} to="/group/performance" isActive={isRouteActive('/group/performance')}>
          Performance
        </NavItem>
      </NavSection>
    </>
  );
  
  return (
    <Box
      minW={{ base: 'full', md: '240px' }}
      w={{ base: 'full', md: '240px' }}
      bg={bgColor}
      borderRightWidth="1px"
      borderColor={borderColor}
      pos="relative"
      h="full"
      display={{ base: 'none', md: 'block' }}
      overflowY="auto"
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Heading as="h1" size="lg" fontWeight="bold">
          FinDashboard
        </Heading>
      </Flex>
      
      {/* Mode Selector */}
      <Box mx={4} my={6}>
        <ModeSelector />
      </Box>
      
      <Divider mb={4} />
      
      {/* Mode-specific Navigation */}
      {currentMode === MODES.PERSONAL && <PersonalNavItems />}
      {currentMode === MODES.BUSINESS && <BusinessNavItems />}
      {currentMode === MODES.GROUP && <GroupNavItems />}
      
      {/* Common Navigation */}
      <NavSection title="General">
        <NavItem icon={FiSettings} to="/settings" isActive={isRouteActive('/settings')}>
          Settings
        </NavItem>
      </NavSection>
    </Box>
  );
};

export default AppSidebar;
