import { useState, useEffect } from 'react';
import { ChakraProvider, extendTheme, Box, Text } from '@chakra-ui/react';
import { AuthProvider } from '../context/AuthContext';
import { FinanceProvider } from '../context/FinanceContext';
import { InvestmentProvider } from '../context/InvestmentContext';
import { ErrorProvider } from '../context/ErrorContext';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/globals.css';

// Create a custom theme with dark mode support
const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  colors: {
    primary: {
      50: '#e6f7ff',
      100: '#b3e0ff',
      200: '#80caff',
      300: '#4db3ff',
      400: '#1a9dff',
      500: '#0087e6',
      600: '#006bb3',
      700: '#004f80',
      800: '#00344d',
      900: '#00141f',
    },
    secondary: {
      50: '#f5f8fa',
      100: '#e6edf2',
      200: '#c7d5e0',
      300: '#a8bece',
      400: '#89a6bc',
      500: '#6a8eaa',
      600: '#4b7698',
      700: '#3a5b76',
      800: '#243a4a',
      900: '#0f1c24',
    },
    success: {
      50: '#e6f9ee',
      100: '#b3ecd1',
      200: '#80dfb3',
      300: '#4dd296',
      400: '#1ac578',
      500: '#00b868',
      600: '#009051',
      700: '#00683b',
      800: '#004025',
      900: '#00180f',
    },
    warning: {
      50: '#fff9e6',
      100: '#ffedb3',
      200: '#ffe080',
      300: '#ffd24d',
      400: '#ffc41a',
      500: '#e6b000',
      600: '#b38900',
      700: '#806200',
      800: '#4d3b00',
      900: '#1f1700',
    },
    danger: {
      50: '#fce8e8',
      100: '#f5b8b8',
      200: '#ee8989',
      300: '#e75a5a',
      400: '#e02b2b',
      500: '#c72424',
      600: '#9b1c1c',
      700: '#701414',
      800: '#450d0d',
      900: '#1a0505',
    },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'md',
        fontWeight: 'medium',
      },
      variants: {
        solid: (props) => ({
          bg: props.colorMode === 'dark' ? 'primary.500' : 'primary.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'primary.400' : 'primary.600',
          },
        }),
      },
    },
    Card: {
      baseStyle: (props) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
          borderRadius: 'lg',
          boxShadow: 'md',
          overflow: 'hidden',
        },
      }),
    },
  },
});

function MyApp({ Component, pageProps }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set loading to false after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <ChakraProvider theme={theme}>
        <Box display="flex" height="100vh" alignItems="center" justifyContent="center">
          <Text fontSize="xl">Loading Financial Dashboard...</Text>
        </Box>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider theme={theme}>
      <ErrorProvider>
        <ErrorBoundary>
          <AuthProvider>
            <FinanceProvider>
              <InvestmentProvider>
                <Component {...pageProps} />
              </InvestmentProvider>
            </FinanceProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ChakraProvider>
  );
}

export default MyApp;
