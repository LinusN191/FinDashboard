import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../utils/firebase';
import { isUsingMockFirebase } from '../utils/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingMockAuth, setUsingMockAuth] = useState(false);

  // Initialize with dev account in development mode
  useEffect(() => {
    const isMockMode = isUsingMockFirebase();
    setUsingMockAuth(isMockMode);
    
    if (isMockMode) {
      console.log('Using mock authentication in development mode');
    }
  }, []);

  // Create user with email and password
  const signup = async (email, password, displayName) => {
    try {
      setError('');
      
      // In development, use mock signup
      if (usingMockAuth) {
        // Create a mock user for development
        const mockUser = {
          uid: 'dev-user-123',
          email: email,
          displayName: displayName || email.split('@')[0],
          emailVerified: true,
          getIdToken: () => Promise.resolve('mock-token-for-development')
        };
        setCurrentUser(mockUser);
        return mockUser;
      }
      
      // Normal signup in production
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
      throw err;
    }
  };

  // Login with email and password
  const login = async (email, password) => {
    try {
      setError('');
      
      // In development, use mock login
      if (usingMockAuth) {
        // Create a mock user for development
        const mockUser = {
          uid: 'dev-user-123',
          email: email,
          displayName: email.split('@')[0],
          emailVerified: true,
          getIdToken: () => Promise.resolve('mock-token-for-development')
        };
        setCurrentUser(mockUser);
        return mockUser;
      }
      
      // Normal login in production
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
      throw err;
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      setError('');
      
      // In development, use mock login
      if (usingMockAuth) {
        // Create a mock Google user for development
        const mockUser = {
          uid: 'google-user-456',
          email: 'dev@gmail.com',
          displayName: 'Dev User',
          emailVerified: true,
          photoURL: 'https://ui-avatars.com/api/?name=Dev+User&background=random',
          getIdToken: () => Promise.resolve('mock-google-token-for-development')
        };
        setCurrentUser(mockUser);
        return mockUser;
      }
      
      // Normal Google login in production
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (err) {
      console.error('Google signup error:', err);
      setError(err.message || 'Failed to login with Google');
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // In development, just clear the user
      if (usingMockAuth) {
        setCurrentUser(null);
        return;
      }
      
      // Normal logout in production
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to log out');
      throw err;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    try {
      // In development with mock auth, don't listen for auth changes
      if (usingMockAuth) {
        setLoading(false);
        return () => {};
      }
      
      // Normal auth listener in production
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Firebase auth initialization error:", error);
      setLoading(false);
      return () => {};
    }
  }, [usingMockAuth]);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    error,
    setError,
    loading,
    usingMockAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
