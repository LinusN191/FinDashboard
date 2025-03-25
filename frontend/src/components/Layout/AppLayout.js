import React, { useEffect } from 'react';
import { Box, Flex, VStack, useColorModeValue } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMode, MODES } from '../../context/ModeContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

const AppLayout = ({ children }) => {
  const { currentMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  
  // Handle route redirection based on selected mode
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Redirect to the appropriate dashboard based on mode
    if (currentPath === '/') {
      switch (currentMode) {
        case MODES.PERSONAL:
          navigate('/dashboard');
          break;
        case MODES.BUSINESS:
          navigate('/business');
          break;
        case MODES.GROUP:
          navigate('/group');
          break;
        default:
          navigate('/dashboard');
      }
    }
  }, [currentMode, navigate, location.pathname]);
  
  return (
    <Flex h="100vh" bg={bgColor}>
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <Box flex="1" overflow="auto">
        <VStack spacing={0} align="stretch" h="100%">
          {/* Header */}
          <AppHeader />
          
          {/* Content */}
          <Box flex="1" p={4} overflow="auto">
            {children}
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
};

export default AppLayout;
