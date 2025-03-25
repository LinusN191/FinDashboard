import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const ModeContext = createContext();

// Modes available in the application
export const MODES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  GROUP: 'group'
};

// Provider component
export const ModeProvider = ({ children }) => {
  const [currentMode, setCurrentMode] = useState(() => {
    // Try to get saved mode from localStorage
    const savedMode = localStorage.getItem('appMode');
    return savedMode || MODES.PERSONAL;
  });

  // Save mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('appMode', currentMode);
  }, [currentMode]);

  // Switch mode
  const switchMode = (mode) => {
    if (Object.values(MODES).includes(mode)) {
      setCurrentMode(mode);
    } else {
      console.error(`Invalid mode: ${mode}`);
    }
  };

  // Context value
  const value = {
    currentMode,
    switchMode,
    MODES
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
};

// Custom hook to use the context
export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

export default ModeContext;
