import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Flex } from '@chakra-ui/react';

/**
 * PrivateRoute component that handles authentication logic
 * Routes that require authentication should be wrapped in this component
 */
const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Flex>
    );
  }
  
  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Render children if user is authenticated
  return children;
};

export default PrivateRoute;
