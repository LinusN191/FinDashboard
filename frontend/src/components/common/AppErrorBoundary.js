import React from 'react';
import { Box, Alert, AlertIcon, AlertTitle, AlertDescription, Button } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

/**
 * A reusable error boundary component for the FinDashboard app
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Error caught by AppErrorBoundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  render() {
    const { componentName = '', children } = this.props;
    const { hasError, error } = this.state;
    
    if (!hasError) {
      return children;
    }
    
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
            {error?.message || "An unexpected error occurred"}
            
            <Button
              mt={2}
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
}

export default AppErrorBoundary;
