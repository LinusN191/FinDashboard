import React from 'react';
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorMode,
  useColorModeValue,
  Spacer,
  HStack
} from '@chakra-ui/react';
import { FiMoon, FiSun, FiBell, FiSettings, FiLogOut, FiUser } from 'react-icons/fi';
import ModeSelector from '../ModeSelector';
import { useAuth } from '../../context/AuthContext';

const AppHeader = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { currentUser, logout } = useAuth();
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Redirect is handled by auth-related components
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <Box 
      as="header" 
      py={2} 
      px={4}
      bg={bgColor}
      borderBottomWidth="1px"
      borderColor={borderColor}
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      <Flex align="center" h="60px">
        {/* Application Logo/Title - only shown on mobile */}
        <Box display={{ base: 'block', md: 'none' }}>
          <Heading size="md">FinDashboard</Heading>
        </Box>
        
        {/* Mode Selector */}
        <Box ml={{ base: 4, md: 0 }}>
          <ModeSelector variant="compact" size="sm" />
        </Box>
        
        <Spacer />
        
        {/* Right Side Controls */}
        <HStack spacing={2}>
          {/* Theme Toggle */}
          <IconButton
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            onClick={toggleColorMode}
            variant="ghost"
            aria-label="Toggle color mode"
          />
          
          {/* Notifications */}
          <IconButton
            icon={<FiBell />}
            variant="ghost"
            aria-label="Notifications"
          />
          
          {/* User Menu */}
          <Menu>
            <MenuButton>
              <Avatar 
                size="sm" 
                name={currentUser?.displayName || 'User'} 
                src={currentUser?.photoURL} 
              />
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FiUser />}>
                Profile
              </MenuItem>
              <MenuItem icon={<FiSettings />}>
                Settings
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default AppHeader;
