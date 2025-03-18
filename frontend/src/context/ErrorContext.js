import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const ErrorContext = createContext();

/**
 * Error Provider Component
 * Provides centralized error management throughout the application
 */
export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState({});

  // Register an error for a specific component
  const registerError = useCallback((componentId, error) => {
    setErrors(prevErrors => ({
      ...prevErrors,
      [componentId]: error
    }));
    
    // Log error for debugging
    console.error(`Error in ${componentId}:`, error);
  }, []);

  // Clear an error for a specific component
  const clearError = useCallback((componentId) => {
    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[componentId];
      return newErrors;
    });
  }, []);

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
  }, []);

  // Context value
  const contextValue = {
    errors,
    registerError,
    clearError,
    hasError,
    getError,
    clearAllErrors
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
