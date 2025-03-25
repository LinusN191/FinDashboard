import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// Replace with your own Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "findashboard.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "findashboard",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "findashboard.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase in development mode with mock services if in development environment
let app;
let db;
let auth;
let storage;

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    
    // Log successful initialization in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase initialized in development mode with mock services');
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    
    // Setup mock services for development/testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('Setting up mock Firebase services for development');
      
      // Mock implementations can be added here if needed
      db = {
        // Mock methods as needed
      };
      
      auth = {
        // Mock methods as needed
      };
      
      storage = {
        // Mock methods as needed
      };
    }
  }
} else {
  // Mock implementations for server-side rendering
  db = {};
  auth = {};
  storage = {};
}

export { app, db, auth, storage };
