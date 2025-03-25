import React from 'react';
import {
  Box,
  Flex,
  Button,
  ButtonGroup,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { FiUser, FiBriefcase, FiUsers, FiChevronDown } from 'react-icons/fi';
import { useMode, MODES } from '../context/ModeContext';

const ModeSelector = ({ variant = 'full', size = 'md' }) => {
  const { currentMode, switchMode, MODES } = useMode();
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const buttonActiveBg = useColorModeValue('blue.500', 'blue.200');
  const buttonActiveColor = useColorModeValue('white', 'gray.800');
  
  // Get mode name and icon
  const getModeInfo = (mode) => {
    switch (mode) {
      case MODES.PERSONAL:
        return { name: 'Personal', icon: FiUser };
      case MODES.BUSINESS:
        return { name: 'Business', icon: FiBriefcase };
      case MODES.GROUP:
        return { name: 'Group', icon: FiUsers };
      default:
        return { name: 'Personal', icon: FiUser };
    }
  };
  
  const currentModeInfo = getModeInfo(currentMode);
  
  // Handle mode change
  const handleModeChange = (mode) => {
    switchMode(mode);
  };
  
  // Compact dropdown variant
  if (variant === 'compact') {
    return (
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<FiChevronDown />}
          leftIcon={<Icon as={currentModeInfo.icon} />}
          size={size}
        >
          {currentModeInfo.name}
        </MenuButton>
        <MenuList>
          <MenuItem 
            icon={<Icon as={FiUser} />}
            onClick={() => handleModeChange(MODES.PERSONAL)}
            fontWeight={currentMode === MODES.PERSONAL ? 'bold' : 'normal'}
          >
            Personal Finance
          </MenuItem>
          <MenuItem 
            icon={<Icon as={FiBriefcase} />}
            onClick={() => handleModeChange(MODES.BUSINESS)}
            fontWeight={currentMode === MODES.BUSINESS ? 'bold' : 'normal'}
          >
            Business Finance
          </MenuItem>
          <MenuItem 
            icon={<Icon as={FiUsers} />}
            onClick={() => handleModeChange(MODES.GROUP)}
            fontWeight={currentMode === MODES.GROUP ? 'bold' : 'normal'}
          >
            Group Investment
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }
  
  // Full button group variant (default)
  return (
    <Box>
      <Text mb={2} fontWeight="medium">Mode:</Text>
      <ButtonGroup isAttached variant="outline" size={size}>
        <Button
          leftIcon={<Icon as={FiUser} />}
          onClick={() => handleModeChange(MODES.PERSONAL)}
          bg={currentMode === MODES.PERSONAL ? buttonActiveBg : 'transparent'}
          color={currentMode === MODES.PERSONAL ? buttonActiveColor : undefined}
          borderWidth={1}
        >
          Personal
        </Button>
        <Button
          leftIcon={<Icon as={FiBriefcase} />}
          onClick={() => handleModeChange(MODES.BUSINESS)}
          bg={currentMode === MODES.BUSINESS ? buttonActiveBg : 'transparent'}
          color={currentMode === MODES.BUSINESS ? buttonActiveColor : undefined}
          borderWidth={1}
        >
          Business
        </Button>
        <Button
          leftIcon={<Icon as={FiUsers} />}
          onClick={() => handleModeChange(MODES.GROUP)}
          bg={currentMode === MODES.GROUP ? buttonActiveBg : 'transparent'}
          color={currentMode === MODES.GROUP ? buttonActiveColor : undefined}
          borderWidth={1}
        >
          Group
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default ModeSelector;
