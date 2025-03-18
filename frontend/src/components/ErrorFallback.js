import React from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Flex,
  Text
} from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

/**
 * A reusable error fallback component for use with the useErrorHandler hook
 * or as a fallback for React Error Boundary
 */
const ErrorFallback = ({ error, resetErrorBoundary, componentName = '' }) => {
  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      borderColor="red.200"
      bg="red.50"
      color="red.800"
      my={2}
    >
      <Alert
        status="error"
        variant="subtle"
        flexDirection="column"
        alignItems="flex-start"
        borderRadius="md"
      >
        <Flex width="100%" alignItems="center">
          <AlertIcon />
          <AlertTitle fontWeight="bold">
            {componentName ? `${componentName} Error` : 'Error'}
          </AlertTitle>
        </Flex>
        
        <AlertDescription mt={2}>
          <Text fontSize="sm">
            {error?.message || "An unexpected error occurred"}
          </Text>
          
          {resetErrorBoundary && (
            <Button
              mt={3}
              size="sm"
              leftIcon={<FiRefreshCw />}
              colorScheme="red"
              onClick={resetErrorBoundary}
            >
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </Box>
  );
};

export default ErrorFallback;
