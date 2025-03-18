import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Icon,
  IconButton,
  List,
  ListItem,
  Text,
  Badge,
  Flex,
  Stack,
  Divider,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';
import { FiBell, FiCheckCircle, FiAlertCircle, FiInfo, FiClock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

// Sample notifications for development
const sampleNotifications = [
  {
    id: '1',
    type: 'alert',
    title: 'Budget Alert',
    message: 'Your "Groceries" budget is at 85% of its limit.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false
  },
  {
    id: '2',
    type: 'insight',
    title: 'Investment Opportunity',
    message: 'Based on your risk profile, consider adding more tech stocks to diversify your portfolio.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: false
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Savings Goal',
    message: 'You\'re $500 away from your "Vacation" savings goal. Keep it up!',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true
  },
  {
    id: '4',
    type: 'alert',
    title: 'Market Alert',
    message: 'AAPL stock has dropped by 5% today. This might be a buying opportunity.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    read: true
  }
];

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'alert':
      return <Icon as={FiAlertCircle} color="red.500" />;
    case 'insight':
      return <Icon as={FiInfo} color="blue.500" />;
    case 'reminder':
      return <Icon as={FiClock} color="orange.500" />;
    default:
      return <Icon as={FiBell} color="gray.500" />;
  }
};

const NotificationCenter = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  
  // Load notifications effect
  useEffect(() => {
    // In a real app, we would fetch from the database
    // For now, use sample data
    setNotifications(sampleNotifications);
    
    // Count unread notifications
    const count = sampleNotifications.filter(notif => !notif.read).length;
    setUnreadCount(count);
  }, [user]);
  
  // Mark a notification as read
  const markAsRead = (id) => {
    const updatedNotifications = notifications.map(notif => {
      if (notif.id === id && !notif.read) {
        return { ...notif, read: true };
      }
      return notif;
    });
    
    setNotifications(updatedNotifications);
    setUnreadCount(prevCount => Math.max(0, prevCount - 1));
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notif => ({
      ...notif,
      read: true
    }));
    
    setNotifications(updatedNotifications);
    setUnreadCount(0);
  };
  
  // Format timestamp to relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffInMillis = now - notifDate;
    const diffInMinutes = Math.floor(diffInMillis / (1000 * 60));
    const diffInHours = Math.floor(diffInMillis / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMillis / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };
  
  // Colors
  const notifBgColor = useColorModeValue('gray.50', 'gray.700');
  const notifHoverColor = useColorModeValue('gray.100', 'gray.600');
  const badgeBgColor = 'red.500';
  
  return (
    <>
      <Box position="relative" display="inline-block">
        <IconButton
          aria-label="Notifications"
          icon={<FiBell />}
          variant="ghost"
          onClick={onOpen}
          size="lg"
        />
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-1"
            right="-1"
            borderRadius="full"
            bg={badgeBgColor}
            color="white"
            fontSize="xs"
            boxSize="1.25rem"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Box>
      
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <Flex align="center" justify="space-between">
              <Text>Notifications</Text>
              {unreadCount > 0 && (
                <Badge borderRadius="full" px="2" colorScheme="red">
                  {unreadCount} New
                </Badge>
              )}
            </Flex>
          </DrawerHeader>
          
          <DrawerBody p={0}>
            {notifications.length === 0 ? (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                h="full" 
                p={10}
              >
                <Icon as={FiBell} boxSize={12} color="gray.400" mb={4} />
                <Text color="gray.500">No notifications yet</Text>
              </Flex>
            ) : (
              <List spacing={0}>
                {notifications.map((notification) => (
                  <ListItem 
                    key={notification.id} 
                    bg={notification.read ? 'transparent' : notifBgColor}
                    p={4}
                    borderBottomWidth="1px"
                    position="relative"
                    cursor="pointer"
                    transition="background-color 0.2s"
                    _hover={{ bg: notifHoverColor }}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Flex>
                      <Box mr={3} mt={1}>
                        <NotificationIcon type={notification.type} />
                      </Box>
                      <Stack spacing={1} flex={1}>
                        <Flex justify="space-between" align="center">
                          <Text fontWeight="bold">{notification.title}</Text>
                          <Text fontSize="xs" color="gray.500">
                            {formatRelativeTime(notification.timestamp)}
                          </Text>
                        </Flex>
                        <Text fontSize="sm">{notification.message}</Text>
                      </Stack>
                      
                      {!notification.read && (
                        <Box 
                          position="absolute"
                          top="50%"
                          right={3}
                          transform="translateY(-50%)"
                          width={2}
                          height={2}
                          borderRadius="full"
                          bg="primary.500"
                        />
                      )}
                    </Flex>
                  </ListItem>
                ))}
              </List>
            )}
          </DrawerBody>
          
          <DrawerFooter borderTopWidth="1px">
            {unreadCount > 0 ? (
              <Button 
                variant="outline" 
                mr={3} 
                leftIcon={<FiCheckCircle />}
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            ) : (
              <Button variant="outline" mr={3} onClick={onClose}>
                Close
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default NotificationCenter;
