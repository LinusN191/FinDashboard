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

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  }

  toggleDetails = () => {
    this.setState(prevState => ({ 
      showDetails: !prevState.showDetails
    }));
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Box p={5} borderRadius="md" boxShadow="md" bg="white" my={4}>
          <Alert
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            borderRadius="md"
            p={5}
          >
            <FiAlertTriangle size="40px" />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Something went wrong
            </AlertTitle>
            <AlertDescription maxWidth="md">
              <Text mb={4}>
                {this.state.error?.message || "An unexpected error occurred while rendering this component."}
              </Text>
              
              <Stack spacing={4} direction="column" align="center">
                <Button
                  leftIcon={<FiRefreshCw />}
                  colorScheme="red"
                  variant="outline"
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                
                <Button 
                  size="sm" 
                  variant="link" 
                  onClick={this.toggleDetails}
                >
                  {this.state.showDetails ? "Hide Technical Details" : "Show Technical Details"}
                </Button>
                
                <Collapse in={this.state.showDetails} animateOpacity>
                  <Box
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    maxWidth="100%"
                    overflowX="auto"
                    textAlign="left"
                  >
                    <Text fontWeight="bold" mb={2}>Error Stack:</Text>
                    <Code colorScheme="red" whiteSpace="pre-wrap" display="block" p={2} fontSize="xs">
                      {this.state.error?.stack}
                    </Code>
                    
                    {this.state.errorInfo && (
                      <>
                        <Text fontWeight="bold" mt={4} mb={2}>Component Stack:</Text>
                        <Code colorScheme="red" whiteSpace="pre-wrap" display="block" p={2} fontSize="xs">
                          {this.state.errorInfo.componentStack}
                        </Code>
                      </>
                    )}
                  </Box>
                </Collapse>
              </Stack>
            </AlertDescription>
          </Alert>
        </Box>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
