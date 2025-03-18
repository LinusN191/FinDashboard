import React from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Flex
} from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

/**
 * Higher Order Component (HOC) that provides error handling capabilities
 * to any wrapped component
 * 
 * @param {React.Component} WrappedComponent - The component to wrap with error handling
 * @param {Object} options - Configuration options
 * @returns {React.Component} - Enhanced component with error handling
 */
const withErrorHandling = (WrappedComponent, options = {}) => {
  const {
    componentName = '',
    fallbackUI = null,
    onError = null
  } = options;
  
  // Create a wrapped component with error handling
  class WithErrorHandling extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        hasError: false,
        error: null,
        errorInfo: null
      };
    }

    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      // Log the error to console
      console.error(`Error in ${componentName || 'component'}:`, error, errorInfo);
      
      // Store error info for display
      this.setState({ errorInfo });
      
      // Call custom error handler if provided
      if (onError && typeof onError === 'function') {
        onError(error, errorInfo);
      }
    }

    handleRetry = () => {
      // Reset error state to trigger a re-render
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }

    render() {
      // If there's an error, render fallback UI
      if (this.state.hasError) {
        // If custom fallback UI is provided, use it
        if (fallbackUI) {
          return typeof fallbackUI === 'function' 
            ? fallbackUI(this.state.error, this.handleRetry)
            : fallbackUI;
        }
        
        // Default error UI
        return (
          <Box p={4} borderWidth="1px" borderRadius="md" my={2}>
            <Alert
              status="error"
              variant="left-accent"
              flexDirection="column"
              alignItems="flex-start"
            >
              <Flex width="100%" alignItems="center">
                <AlertIcon />
                <AlertTitle fontWeight="bold">
                  {componentName ? `${componentName} Error` : 'Component Error'}
                </AlertTitle>
              </Flex>
              
              <AlertDescription mt={2}>
                <Box fontSize="sm">
                  {this.state.error && this.state.error.message 
                    ? this.state.error.message 
                    : 'An unexpected error occurred'}
                </Box>
                
                <Button
                  mt={3}
                  size="sm"
                  leftIcon={<FiRefreshCw />}
                  colorScheme="red"
                  variant="outline"
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </Box>
        );
      }

      // Otherwise, render the wrapped component normally
      return <WrappedComponent {...this.props} />;
    }
  }

  // Display name for debugging
  WithErrorHandling.displayName = `WithErrorHandling(${componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithErrorHandling;
};

export default withErrorHandling;
