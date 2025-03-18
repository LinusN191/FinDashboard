import React from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button
} from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

/**
 * A simple error wrapper component that can be used directly in component render methods
 */
const ErrorWrapper = ({ 
  error, 
  onRetry, 
  componentName = '',
  showRetry = true 
}) => {
  if (!error) return null;
  
  return (
    <Box p={4} my={2}>
      <Alert 
        status="error" 
        variant="left-accent" 
        borderRadius="md"
        flexDirection="column"
        alignItems="flex-start"
      >
        <AlertIcon />
        <AlertTitle mt={1} mb={1} fontSize="md">
          {componentName ? `${componentName} Error` : 'Error'}
        </AlertTitle>
        
        <AlertDescription display="block" fontSize="sm">
          {error.message || "An unexpected error occurred"}
          
          {showRetry && onRetry && (
            <Button
              mt={2}
              size="sm"
              leftIcon={<FiRefreshCw />}
              colorScheme="red"
              variant="outline"
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </Box>
  );
};

export default ErrorWrapper;
