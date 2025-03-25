import React, { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import ErrorFallback from './ErrorFallback';
import { useError } from '../context/ErrorContext';

/**
 * ErrorWrapper Component
 * 
 * A component that wraps children and displays an error UI when an error occurs.
 * This component integrates with the ErrorContext for centralized error management.
 * 
 * @param {Object} props
 * @param {Error|null} props.error - The error object if one exists
 * @param {Function} props.onRetry - Function to call when retry is clicked
 * @param {string} props.componentName - Name of the component being wrapped (for error reporting)
 * @param {React.ReactNode} props.children - Children components to render
 */
const ErrorWrapper = ({ error, onRetry, componentName = 'Component', children }) => {
  const [internalError, setInternalError] = useState(null);
  const { registerError, clearError } = useError();
  const componentId = componentName.toLowerCase().replace(/\s+/g, '_');
  
  // Register error with the context when error prop changes
  useEffect(() => {
    if (error) {
      // Register the error with the central error system
      registerError(componentId, error);
      setInternalError(error);
    } else {
      // Clear any previous errors
      clearError(componentId);
      setInternalError(null);
    }
  }, [error, componentId, registerError, clearError]);

  // Handle errors during rendering with an error boundary-like pattern
  const handleRenderError = (error) => {
    console.error(`Error rendering ${componentName}:`, error);
    setInternalError(error);
    registerError(componentId, error);
  };

  // Reset both internal and context errors
  const handleRetry = () => {
    setInternalError(null);
    clearError(componentId);
    
    if (onRetry && typeof onRetry === 'function') {
      onRetry();
    }
  };

  // If there's an error, show the error UI
  if (internalError) {
    return (
      <ErrorFallback
        error={internalError}
        resetErrorBoundary={handleRetry}
        componentName={componentName}
      />
    );
  }

  // Otherwise, render children inside a try-catch block
  try {
    return children;
  } catch (error) {
    handleRenderError(error);
    return (
      <ErrorFallback
        error={error}
        resetErrorBoundary={handleRetry}
        componentName={componentName}
      />
    );
  }
};

export default ErrorWrapper;
