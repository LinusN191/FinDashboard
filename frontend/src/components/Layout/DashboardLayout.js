import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorMode,
  useColorModeValue,
  Stack,
  Heading,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Divider,
  Link,
  HStack,
  Button,
  ButtonGroup,
  Tooltip,
  useToast
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { 
  FiMenu, 
  FiMoon, 
  FiSun, 
  FiLogOut, 
  FiUser, 
  FiSettings, 
  FiHome,
  FiDollarSign,
  FiBarChart2,
  FiPieChart,
  FiTarget,
  FiTrendingUp,
  FiBriefcase,
  FiUsers
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from '../Notifications/NotificationCenter';

// Mode switch constants
const MODES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  GROUP: 'group'
};

const NavItem = ({ icon, children, href, onClick, isActive }) => {
  const activeColor = useColorModeValue('primary.600', 'primary.300');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <NextLink href={href} passHref>
      <Link 
        display="flex"
        alignItems="center"
        p={2}
        borderRadius="md"
        color={isActive ? activeColor : undefined}
        fontWeight={isActive ? 'bold' : 'normal'}
        onClick={onClick}
        _hover={{ textDecoration: 'none', bg: hoverBg }}
      >
        {icon && <Box mr={3}>{icon}</Box>}
        {children}
      </Link>
    </NextLink>
  );
};

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  const toast = useToast();
  
  // Mode state
  const [currentMode, setCurrentMode] = useState(() => {
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('appMode');
      return savedMode || MODES.PERSONAL;
    }
    return MODES.PERSONAL;
  });
  
  // Save mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('appMode', currentMode);
  }, [currentMode]);
  
  // Handle mode switch
  const handleModeSwitch = (mode) => {
    setCurrentMode(mode);
    
    // Navigate to appropriate dashboard based on mode
    switch(mode) {
      case MODES.PERSONAL:
        router.push('/dashboard');
        break;
      case MODES.BUSINESS:
        router.push('/business');
        break;
      case MODES.GROUP:
        router.push('/group');
        break;
      default:
        router.push('/dashboard');
    }
    
    toast({
      title: `Switched to ${mode} mode`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check current route
  const isActiveRoute = (path) => {
    return router.pathname === path;
  };

  return (
    <Box minH="100vh">
      {/* Navbar */}
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding="1rem"
        bg={bg}
        color={useColorModeValue('gray.600', 'white')}
        borderBottomWidth="1px"
        borderBottomColor={borderColor}
        boxShadow="sm"
        position="sticky"
        top="0"
        zIndex="sticky"
      >
        <Flex align="center">
          <IconButton
            icon={<FiMenu />}
            variant="ghost"
            aria-label="Menu"
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpen}
            mr="2"
          />
          <NextLink href="/home" passHref>
            <Link _hover={{ textDecoration: 'none' }}>
              <Heading size="md" fontWeight="bold" color={useColorModeValue('primary.600', 'primary.300')}>
                FinDashboard
              </Heading>
            </Link>
          </NextLink>
        </Flex>
        
        {/* Mode Switcher */}
        <Box display={{ base: 'none', md: 'block' }} ml={4}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="Personal Finance Mode">
              <Button
                leftIcon={<FiUser />}
                onClick={() => handleModeSwitch(MODES.PERSONAL)}
                colorScheme={currentMode === MODES.PERSONAL ? 'blue' : 'gray'}
                variant={currentMode === MODES.PERSONAL ? 'solid' : 'outline'}
              >
                Personal
              </Button>
            </Tooltip>
            <Tooltip label="Business Finance Mode">
              <Button
                leftIcon={<FiBriefcase />}
                onClick={() => handleModeSwitch(MODES.BUSINESS)}
                colorScheme={currentMode === MODES.BUSINESS ? 'green' : 'gray'}
                variant={currentMode === MODES.BUSINESS ? 'solid' : 'outline'}
              >
                Business
              </Button>
            </Tooltip>
            <Tooltip label="Group Investment Mode">
              <Button
                leftIcon={<FiUsers />}
                onClick={() => handleModeSwitch(MODES.GROUP)}
                colorScheme={currentMode === MODES.GROUP ? 'purple' : 'gray'}
                variant={currentMode === MODES.GROUP ? 'solid' : 'outline'}
              >
                Group
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>
        
        {/* Desktop Navigation */}
        <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
          <NavItem 
            href="/home" 
            icon={<FiHome />} 
            isActive={isActiveRoute('/home')}
          >
            Home
          </NavItem>
          <NavItem 
            href="/dashboard/investments" 
            icon={<FiBarChart2 />} 
            isActive={isActiveRoute('/dashboard/investments')}
          >
            Investments
          </NavItem>
          <NavItem 
            href="/dashboard/finance" 
            icon={<FiDollarSign />} 
            isActive={isActiveRoute('/dashboard/finance')}
          >
            Personal Finance
          </NavItem>
        </HStack>

        <Stack direction="row" spacing={3} align="center">
          <NotificationCenter />
          
          <IconButton
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            variant="ghost"
            aria-label="Toggle color mode"
            onClick={toggleColorMode}
          />
          
          <Menu>
            <MenuButton>
              <Avatar size="sm" name={user?.displayName || 'User'} src={user?.photoURL} />
            </MenuButton>
            <MenuList>
              <NextLink href="/profile" passHref>
                <MenuItem as="a" icon={<FiUser />}>Profile</MenuItem>
              </NextLink>
              <MenuItem icon={<FiSettings />}>Settings</MenuItem>
              <Divider />
              <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </Stack>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">FinDashboard</DrawerHeader>
          <DrawerBody>
            {/* Mobile Mode Switcher */}
            <Box mb={6}>
              <Text fontWeight="medium" mb={2}>Mode:</Text>
              <ButtonGroup size="sm" isAttached variant="outline" width="full">
                <Button
                  leftIcon={<FiUser />}
                  onClick={() => {
                    handleModeSwitch(MODES.PERSONAL);
                    onClose();
                  }}
                  colorScheme={currentMode === MODES.PERSONAL ? 'blue' : 'gray'}
                  variant={currentMode === MODES.PERSONAL ? 'solid' : 'outline'}
                  flex="1"
                >
                  Personal
                </Button>
                <Button
                  leftIcon={<FiBriefcase />}
                  onClick={() => {
                    handleModeSwitch(MODES.BUSINESS);
                    onClose();
                  }}
                  colorScheme={currentMode === MODES.BUSINESS ? 'green' : 'gray'}
                  variant={currentMode === MODES.BUSINESS ? 'solid' : 'outline'}
                  flex="1"
                >
                  Business
                </Button>
                <Button
                  leftIcon={<FiUsers />}
                  onClick={() => {
                    handleModeSwitch(MODES.GROUP);
                    onClose();
                  }}
                  colorScheme={currentMode === MODES.GROUP ? 'purple' : 'gray'}
                  variant={currentMode === MODES.GROUP ? 'solid' : 'outline'}
                  flex="1"
                >
                  Group
                </Button>
              </ButtonGroup>
            </Box>
            
            <Divider mb={4} />
            
            <Stack spacing={4} pt={2}>
              <NavItem 
                href="/home" 
                icon={<FiHome />} 
                isActive={isActiveRoute('/home')}
                onClick={onClose}
              >
                Home
              </NavItem>
              <NavItem 
                href="/dashboard/investments" 
                icon={<FiBarChart2 />} 
                isActive={isActiveRoute('/dashboard/investments')}
                onClick={onClose}
              >
                Investments
              </NavItem>
              <NavItem 
                href="/dashboard/finance" 
                icon={<FiDollarSign />} 
                isActive={isActiveRoute('/dashboard/finance')}
                onClick={onClose}
              >
                Personal Finance
              </NavItem>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Page Content */}
      <Box py={6} px={{ base: 4, md: 8 }}>
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
