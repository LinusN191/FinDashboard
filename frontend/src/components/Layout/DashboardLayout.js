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
  HStack
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
  FiTrendingUp
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from '../Notifications/NotificationCenter';

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
          <NextLink href="/dashboard" passHref>
            <Link _hover={{ textDecoration: 'none' }}>
              <Heading size="md" fontWeight="bold" color={useColorModeValue('primary.600', 'primary.300')}>
                FinDashboard
              </Heading>
            </Link>
          </NextLink>
        </Flex>
        
        {/* Desktop Navigation */}
        <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
          <NavItem 
            href="/dashboard" 
            icon={<FiHome />} 
            isActive={isActiveRoute('/dashboard')}
          >
            Overview
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
            <Stack spacing={4} pt={2}>
              <NavItem 
                href="/dashboard" 
                icon={<FiHome />} 
                isActive={isActiveRoute('/dashboard')}
                onClick={onClose}
              >
                Overview
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
              
              <Divider />
              
              <Text fontWeight="bold" color="gray.500" fontSize="sm" px={2} pt={2}>
                INVESTMENT
              </Text>
              <NavItem 
                href="/dashboard/investments" 
                icon={<FiTrendingUp />} 
                onClick={onClose}
              >
                Analytics
              </NavItem>
              <NavItem 
                href="/dashboard/portfolio" 
                icon={<FiPieChart />} 
                onClick={onClose}
              >
                Portfolio
              </NavItem>
              
              <Divider />
              
              <Text fontWeight="bold" color="gray.500" fontSize="sm" px={2} pt={2}>
                PERSONAL FINANCE
              </Text>
              <NavItem 
                href="/dashboard/finance?tab=budget" 
                icon={<FiDollarSign />} 
                onClick={onClose}
              >
                Budget
              </NavItem>
              <NavItem 
                href="/dashboard/finance?tab=expenses" 
                icon={<FiDollarSign />} 
                onClick={onClose}
              >
                Expenses
              </NavItem>
              <NavItem 
                href="/dashboard/finance?tab=debt" 
                icon={<FiDollarSign />} 
                onClick={onClose}
              >
                Debt
              </NavItem>
              <NavItem 
                href="/dashboard/finance?tab=savings" 
                icon={<FiTarget />} 
                onClick={onClose}
              >
                Savings Goals
              </NavItem>
              
              <Divider />
              
              <NavItem 
                href="/profile" 
                icon={<FiUser />} 
                isActive={isActiveRoute('/profile')}
                onClick={onClose}
              >
                Profile
              </NavItem>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Box py={6} px={{ base: 4, md: 8 }}>
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
