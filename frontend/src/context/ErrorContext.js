import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const ErrorContext = createContext();

/**
 * Error Provider Component
 * Provides centralized error management throughout the application
 */
export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  // Register an error for a specific component
  const registerError = useCallback((componentId, error) => {
    console.group(`Error in ${componentId}`);
    console.error(error);
    console.groupEnd();
    
    setErrors(prevErrors => ({
      ...prevErrors,
      [componentId]: error
    }));
    
    // If this is a critical error, set it as global
    if (error?.critical) {
      setGlobalError(error);
    }
  }, []);

  // Clear an error for a specific component
  const clearError = useCallback((componentId) => {
    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[componentId];
      return newErrors;
    });
    
    // Clear global error if it was from this component
    if (globalError?.componentId === componentId) {
      setGlobalError(null);
    }
  }, [globalError]);

  // Check if a specific component has an error
  const hasError = useCallback((componentId) => {
    return !!errors[componentId];
  }, [errors]);

  // Get error for a specific component
  const getError = useCallback((componentId) => {
    return errors[componentId];
  }, [errors]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
    setGlobalError(null);
  }, []);
  
  // Create error handler for try/catch blocks
  const createErrorHandler = useCallback((componentId) => {
    return (error, action) => {
      const enhancedError = {
        ...error,
        message: error.message || `Error ${action ? 'during ' + action : ''}`,
        componentId,
        timestamp: new Date().toISOString()
      };
      registerError(componentId, enhancedError);
      return enhancedError;
    };
  }, [registerError]);

  // Context value
  const contextValue = {
    errors,
    globalError,
    registerError,
    clearError,
    hasError,
    getError,
    clearAllErrors,
    createErrorHandler
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

/**
 * Custom hook to use the error context
 */
export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export default ErrorContext;
