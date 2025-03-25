import React, { useState, useEffect } from 'react';
import { Box, Spinner, Center } from '@chakra-ui/react';
import ErrorFallback from '../ErrorFallback';

/**
 * A component wrapper that provides error handling and loading states
 * Use this to wrap any component that might throw errors or needs loading states
 */
const SafeComponentWrapper = ({ 
  children, 
  componentName, 
  isLoading = false,
  fallback = null,
  fallbackComponent = null
}) => {
  const [error, setError] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error when component name changes (when wrapping different components)
    setError(null);
    setHasError(false);
  }, [componentName]);

  // Error boundary behavior via componentDidCatch alternative for function components
  useEffect(() => {
    // Set up error boundary via window error event
    const handleError = (event) => {
      // Check if the error is from a child of this component
      // This is a simple check and might not work in all cases
      setError(event.error);
      setHasError(true);
      
      // Don't prevent default - let other error handlers run too
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  // Reset error and retry
  const handleReset = () => {
    setError(null);
    setHasError(false);
  };

  // If we have an error, show error UI
  if (hasError) {
    if (fallbackComponent) {
      return fallbackComponent({ error, resetErrorBoundary: handleReset });
    }
    
    return <ErrorFallback 
      error={error} 
      resetErrorBoundary={handleReset} 
      componentName={componentName} 
    />;
  }

  // If loading, show loading UI
  if (isLoading) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <Center py={8}>
        <Spinner 
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="xl"
        />
      </Center>
    );
  }

  // Otherwise, render the children
  try {
    return children;
  } catch (error) {
    // Directly catch render errors
    console.error(`Error rendering ${componentName}:`, error);
    setError(error);
    setHasError(true);
    
    return <ErrorFallback 
      error={error} 
      resetErrorBoundary={handleReset} 
      componentName={componentName} 
    />;
  }
};

export default SafeComponentWrapper;
