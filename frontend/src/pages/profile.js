import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Avatar,
  AvatarBadge,
  IconButton,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  useColorMode,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiEdit, FiUpload, FiMoon, FiSun, FiLock, FiDownload } from 'react-icons/fi';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateProfile, loading, error, logout } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    darkMode: colorMode === 'dark',
    emailNotifications: true,
    dataExport: false
  });
  
  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        ...formData,
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle preference changes
  const handlePreferenceChange = (name) => {
    setPreferences({
      ...preferences,
      [name]: !preferences[name]
    });
    
    // Handle dark mode toggle
    if (name === 'darkMode') {
      toggleColorMode();
    }
  };
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      await updateProfile({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber
      });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      console.error('Profile update error:', err);
      
      toast({
        title: 'Update failed',
        description: err.message || 'An error occurred while updating your profile.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  // Handle password update
  const handlePasswordUpdate = async () => {
    // Validate passwords
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'The new password and confirmation do not match.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    try {
      // Update password logic would go here
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Password update error:', err);
      
      toast({
        title: 'Update failed',
        description: err.message || 'An error occurred while updating your password.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <DashboardLayout>
      <Box p={4}>
        <Heading size="lg" mb={6}>User Profile</Heading>
        
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <Tabs colorScheme="primary" isLazy>
          <TabList>
            <Tab>Profile</Tab>
            <Tab>Security</Tab>
            <Tab>Preferences</Tab>
          </TabList>
          
          <TabPanels>
            {/* Profile Tab */}
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={cardBg}
                borderColor={borderColor}
              >
                <Flex direction={{ base: "column", md: "row" }} mb={6}>
                  <Box mb={{ base: 4, md: 0 }} mr={{ md: 6 }} textAlign="center">
                    <Avatar 
                      size="xl" 
                      src={user?.photoURL} 
                      name={user?.displayName || 'User'}
                    >
                      <AvatarBadge
                        as={IconButton}
                        size="sm"
                        rounded="full"
                        bottom="0"
                        colorScheme="primary"
                        aria-label="Upload picture"
                        icon={<FiUpload />}
                      />
                    </Avatar>
                  </Box>
                  
                  <Stack flex={1} spacing={4} maxW={{ md: "3xl" }}>
                    <Heading size="md">Profile Information</Heading>
                    <FormControl>
                      <FormLabel>Full Name</FormLabel>
                      <Input 
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        borderColor={borderColor}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Email Address</FormLabel>
                      <Input 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        isReadOnly={true}
                        borderColor={borderColor}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Phone Number</FormLabel>
                      <Input 
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        borderColor={borderColor}
                      />
                    </FormControl>
                    
                    <Button 
                      colorScheme="primary" 
                      alignSelf="flex-start"
                      onClick={handleProfileUpdate}
                      isLoading={loading}
                    >
                      Save Changes
                    </Button>
                  </Stack>
                </Flex>
              </Box>
            </TabPanel>
            
            {/* Security Tab */}
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={cardBg}
                borderColor={borderColor}
              >
                <Stack spacing={4} maxW="3xl">
                  <Heading size="md" mb={2}>Change Password</Heading>
                  
                  <FormControl>
                    <FormLabel>Current Password</FormLabel>
                    <Input 
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      borderColor={borderColor}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>New Password</FormLabel>
                    <Input 
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      borderColor={borderColor}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Confirm New Password</FormLabel>
                    <Input 
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      borderColor={borderColor}
                    />
                  </FormControl>
                  
                  <Button 
                    colorScheme="primary" 
                    leftIcon={<FiLock />}
                    alignSelf="flex-start"
                    onClick={handlePasswordUpdate}
                    isLoading={loading}
                    isDisabled={!formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                  >
                    Update Password
                  </Button>
                  
                  <Divider my={6} />
                  
                  <Heading size="md" mb={2}>Account Actions</Heading>
                  
                  <Button 
                    variant="outline"
                    colorScheme="red"
                    onClick={handleLogout}
                    alignSelf="flex-start"
                  >
                    Logout
                  </Button>
                </Stack>
              </Box>
            </TabPanel>
            
            {/* Preferences Tab */}
            <TabPanel>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg={cardBg}
                borderColor={borderColor}
              >
                <Stack spacing={6} maxW="3xl">
                  <Heading size="md" mb={2}>App Settings</Heading>
                  
                  <Flex align="center" justify="space-between">
                    <Box>
                      <Text fontWeight="medium">Dark Mode</Text>
                      <Text fontSize="sm" color="gray.500">
                        Switch between light and dark themes
                      </Text>
                    </Box>
                    <Switch 
                      colorScheme="primary"
                      isChecked={preferences.darkMode}
                      onChange={() => handlePreferenceChange('darkMode')}
                    />
                  </Flex>
                  
                  <Divider />
                  
                  <Heading size="md" mb={2}>Notifications</Heading>
                  
                  <Flex align="center" justify="space-between">
                    <Box>
                      <Text fontWeight="medium">Email Notifications</Text>
                      <Text fontSize="sm" color="gray.500">
                        Receive email updates about your account and financial insights
                      </Text>
                    </Box>
                    <Switch 
                      colorScheme="primary"
                      isChecked={preferences.emailNotifications}
                      onChange={() => handlePreferenceChange('emailNotifications')}
                    />
                  </Flex>
                  
                  <Divider />
                  
                  <Heading size="md" mb={2}>Data Management</Heading>
                  
                  <Flex align="center" justify="space-between">
                    <Box>
                      <Text fontWeight="medium">Automated Data Export</Text>
                      <Text fontSize="sm" color="gray.500">
                        Automatically export your financial data on a monthly basis
                      </Text>
                    </Box>
                    <Switch 
                      colorScheme="primary"
                      isChecked={preferences.dataExport}
                      onChange={() => handlePreferenceChange('dataExport')}
                    />
                  </Flex>
                  
                  <Button 
                    leftIcon={<FiDownload />}
                    variant="outline"
                    alignSelf="flex-start"
                    mt={2}
                  >
                    Export All Data
                  </Button>
                </Stack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DashboardLayout>
  );
};

export default Profile;
