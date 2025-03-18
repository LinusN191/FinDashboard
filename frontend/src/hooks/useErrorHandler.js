import { useState, useCallback } from 'react';

/**
 * Custom hook for handling errors in React components.
 * Provides a state for error and a function to handle errors.
 * 
 * @param {Function} onError - Optional callback for when an error is caught
 * @returns {Object} - Object containing error state and error handler function
 */
const useErrorHandler = (onError) => {
  const [error, setError] = useState(null);

  const handleError = useCallback((error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
    
    // If an onError callback was provided, call it with the error
    if (onError && typeof onError === 'function') {
      onError(error);
    }
  }, [onError]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, resetError };
};

export default useErrorHandler;
