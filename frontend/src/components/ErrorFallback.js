import React, { useState } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Flex,
  Text,
  Code,
  Collapse
} from '@chakra-ui/react';
import { FiRefreshCw, FiInfo } from 'react-icons/fi';

/**
 * A reusable error fallback component for use with the useErrorHandler hook
 * or as a fallback for React Error Boundary
 */
const ErrorFallback = ({ error, resetErrorBoundary, componentName = '' }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const handleReset = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      // If no reset function provided, refresh the page as a fallback
      window.location.reload();
    }
  };

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      borderColor="red.200"
      bg="red.50"
      color="red.800"
      my={2}
      maxW="800px"
      mx="auto"
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
        
        <AlertDescription mt={2} width="100%">
          <Text fontSize="sm">
            {error?.message || "An unexpected error occurred"}
          </Text>

          <Flex mt={4} justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Button
              size="sm"
              leftIcon={<FiRefreshCw />}
              colorScheme="red"
              onClick={handleReset}
            >
              Try Again
            </Button>
            
            <Button
              size="sm"
              leftIcon={<FiInfo />}
              variant="outline"
              colorScheme="red"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </Flex>
          
          <Collapse in={showDetails} animateOpacity>
            <Box 
              mt={4} 
              p={3} 
              bg="blackAlpha.50" 
              borderRadius="md" 
              fontSize="xs"
              overflowX="auto"
            >
              <Text fontWeight="bold" mb={2}>Error Details:</Text>
              <Code display="block" whiteSpace="pre-wrap" p={2}>
                {error?.stack || JSON.stringify(error, null, 2) || "No additional details available"}
              </Code>
            </Box>
          </Collapse>
        </AlertDescription>
      </Alert>
    </Box>
  );
};

export default ErrorFallback;
