import React, { Component } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Stack,
  Code,
  Collapse,
  Text
} from '@chakra-ui/react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Optional: Send error to a logging service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error, errorInfo) {
    // This would be implemented to log to a service like Sentry, LogRocket, etc.
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.group('Error details for logging:');
      console.error(error);
      console.error(errorInfo?.componentStack);
      console.groupEnd();
    }
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
    
    // Call the onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Force refresh the page as a last resort if the app is in a broken state
    if (this.props.refreshOnReset) {
      window.location.href = '/';
    }
  }
  
  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { fallback, children } = this.props;
    
    // Don't show error for errors inside ErrorBoundary itself
    try {
      // If there's no error, render children
      if (!hasError) {
        return children;
      }
      
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback({ error, resetError: this.resetError });
      }
      
      // Default error UI
      return (
        <Box 
          p={5} 
          borderWidth="1px" 
          borderRadius="lg" 
          borderColor="red.200"
          bg="red.50"
          maxW="800px"
          mx="auto"
          my={8}
        >
          <Alert 
            status="error" 
            variant="subtle"
            flexDirection="column"
            alignItems="flex-start"
            borderRadius="md"
          >
            <Stack direction="row" w="100%" align="center">
              <AlertIcon as={FiAlertTriangle} boxSize={6} mr={2} />
              <AlertTitle fontSize="lg" fontWeight="bold">
                Something went wrong
              </AlertTitle>
            </Stack>
            
            <AlertDescription mt={4} w="100%">
              <Text mb={4}>
                {error?.message || "An unexpected error occurred in the application."}
              </Text>
              
              <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mt={2}>
                <Button
                  leftIcon={<FiRefreshCw />}
                  colorScheme="red"
                  onClick={this.resetError}
                  size="sm"
                >
                  Try Again
                </Button>
                
                {errorInfo && (
                  <Button
                    variant="outline"
                    colorScheme="red"
                    onClick={this.toggleDetails}
                    size="sm"
                  >
                    {showDetails ? 'Hide' : 'Show'} Technical Details
                  </Button>
                )}
              </Stack>
              
              {errorInfo && (
                <Collapse in={showDetails} animateOpacity>
                  <Box 
                    mt={4} 
                    p={3} 
                    bg="blackAlpha.50" 
                    borderRadius="md" 
                    overflowX="auto"
                  >
                    <Text fontWeight="bold" fontSize="sm" mb={2}>Error Stack Trace:</Text>
                    <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={2}>
                      {errorInfo.componentStack}
                    </Code>
                  </Box>
                </Collapse>
              )}
            </AlertDescription>
          </Alert>
        </Box>
      );
    } catch (internalError) {
      // If there's an error rendering the error UI, render minimal fallback
      console.error('Error rendering error boundary UI:', internalError);
      return (
        <Box p={5} borderWidth="1px" borderRadius="lg" mx="auto" my={8}>
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Critical Error</AlertTitle>
            <AlertDescription>
              The application has encountered a critical error.
              <Button
                ml={4}
                size="sm"
                colorScheme="red"
                onClick={() => window.location.href = '/'}
              >
                Reload App
              </Button>
            </AlertDescription>
          </Alert>
        </Box>
      );
    }
  }
}

export default ErrorBoundary;
