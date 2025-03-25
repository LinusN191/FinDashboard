import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useError } from './ErrorContext';
import { collection, query, where, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// Create Business Context
const BusinessContext = createContext();

// Mock data for development purposes
const MOCK_BUSINESSES = [
  {
    id: 'biz-1',
    name: 'Acme Corporation',
    type: 'Corporation',
    industry: 'Technology',
    taxId: 'TX12345678',
    email: 'info@acmecorp.com',
    phone: '123-456-7890',
    address: '123 Business St, San Francisco, CA 94107',
    website: 'www.acmecorp.com',
    createdAt: new Date(2022, 0, 15).toISOString(),
    fiscalYearEnd: '12-31',
    currency: 'USD'
  },
  {
    id: 'biz-2',
    name: 'Global Ventures',
    type: 'Partnership',
    industry: 'Consulting',
    taxId: 'TX87654321',
    email: 'contact@globalventures.com',
    phone: '987-654-3210',
    address: '456 Venture Ave, New York, NY 10001',
    website: 'www.globalventures.com',
    createdAt: new Date(2023, 3, 10).toISOString(),
    fiscalYearEnd: '06-30',
    currency: 'USD'
  }
];

const MOCK_TRANSACTIONS = [
  {
    id: 'tr-1',
    businessId: 'biz-1',
    type: 'income',
    amount: 15000,
    currency: 'USD',
    category: 'Sales',
    description: 'Software license sales',
    date: new Date(2025, 2, 20).toISOString(),
    paymentMethod: 'Bank Transfer',
    reference: 'INV-2025-001',
    status: 'completed',
    attachments: [],
    createdAt: new Date(2025, 2, 20).toISOString()
  },
  {
    id: 'tr-2',
    businessId: 'biz-1',
    type: 'expense',
    amount: 3500,
    currency: 'USD',
    category: 'Rent',
    description: 'Office rent for March 2025',
    date: new Date(2025, 2, 1).toISOString(),
    paymentMethod: 'Bank Transfer',
    reference: 'RENT-MAR-2025',
    status: 'completed',
    attachments: [],
    createdAt: new Date(2025, 2, 1).toISOString()
  },
  {
    id: 'tr-3',
    businessId: 'biz-1',
    type: 'expense',
    amount: 2200,
    currency: 'USD',
    category: 'Utilities',
    description: 'Electricity and internet',
    date: new Date(2025, 2, 15).toISOString(),
    paymentMethod: 'Credit Card',
    reference: 'UTIL-MAR-2025',
    status: 'completed',
    attachments: [],
    createdAt: new Date(2025, 2, 15).toISOString()
  },
  {
    id: 'tr-4',
    businessId: 'biz-1',
    type: 'income',
    amount: 8500,
    currency: 'USD',
    category: 'Consulting',
    description: 'IT consulting services',
    date: new Date(2025, 2, 25).toISOString(),
    paymentMethod: 'Check',
    reference: 'CONS-2025-001',
    status: 'completed',
    attachments: [],
    createdAt: new Date(2025, 2, 25).toISOString()
  },
  {
    id: 'tr-5',
    businessId: 'biz-2',
    type: 'income',
    amount: 12000,
    currency: 'USD',
    category: 'Consulting',
    description: 'Business strategy consulting',
    date: new Date(2025, 2, 18).toISOString(),
    paymentMethod: 'Bank Transfer',
    reference: 'INV-2025-022',
    status: 'completed',
    attachments: [],
    createdAt: new Date(2025, 2, 18).toISOString()
  }
];

const MOCK_INVOICES = [
  {
    id: 'inv-1',
    businessId: 'biz-1',
    customerName: 'TechStart Inc.',
    customerEmail: 'accounts@techstart.com',
    invoiceNumber: 'INV-2025-001',
    issueDate: new Date(2025, 2, 15).toISOString(),
    dueDate: new Date(2025, 3, 15).toISOString(),
    items: [
      { description: 'Software License - Premium Plan', quantity: 2, unitPrice: 5000, amount: 10000 },
      { description: 'Setup and Configuration', quantity: 1, unitPrice: 2500, amount: 2500 }
    ],
    subtotal: 12500,
    tax: 2500,
    total: 15000,
    notes: 'Thank you for your business!',
    status: 'paid',
    paymentDate: new Date(2025, 2, 20).toISOString(),
    currency: 'USD',
    createdAt: new Date(2025, 2, 15).toISOString()
  },
  {
    id: 'inv-2',
    businessId: 'biz-1',
    customerName: 'DataSync Corp',
    customerEmail: 'finance@datasync.com',
    invoiceNumber: 'INV-2025-002',
    issueDate: new Date(2025, 2, 28).toISOString(),
    dueDate: new Date(2025, 3, 28).toISOString(),
    items: [
      { description: 'IT Consulting Services', quantity: 20, unitPrice: 150, amount: 3000 },
      { description: 'Server Maintenance', quantity: 1, unitPrice: 1500, amount: 1500 }
    ],
    subtotal: 4500,
    tax: 900,
    total: 5400,
    notes: 'Net 30 payment terms',
    status: 'pending',
    paymentDate: null,
    currency: 'USD',
    createdAt: new Date(2025, 2, 28).toISOString()
  },
  {
    id: 'inv-3',
    businessId: 'biz-2',
    customerName: 'Global Retail Solutions',
    customerEmail: 'ap@globalretail.com',
    invoiceNumber: 'INV-2025-022',
    issueDate: new Date(2025, 2, 10).toISOString(),
    dueDate: new Date(2025, 3, 10).toISOString(),
    items: [
      { description: 'Business Strategy Consulting', quantity: 40, unitPrice: 250, amount: 10000 },
      { description: 'Market Analysis Report', quantity: 1, unitPrice: 2000, amount: 2000 }
    ],
    subtotal: 12000,
    tax: 0,
    total: 12000,
    notes: 'International client - tax exempt',
    status: 'paid',
    paymentDate: new Date(2025, 2, 18).toISOString(),
    currency: 'USD',
    createdAt: new Date(2025, 2, 10).toISOString()
  }
];

const mockTransactions = [
  {
    id: 'tx1',
    date: new Date().toISOString(),
    description: 'Client Payment - ABC Corp',
    amount: 5000,
    type: 'income',
    category: 'sales',
    notes: 'Payment for consulting services',
    businessId: 'business1'
  },
  {
    id: 'tx2',
    date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    description: 'Office Supplies',
    amount: 150.75,
    type: 'expense',
    category: 'supplies',
    notes: 'Paper, printer ink, and stationery',
    businessId: 'business1'
  },
  {
    id: 'tx3',
    date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    description: 'Software Subscription',
    amount: 49.99,
    type: 'expense',
    category: 'software',
    notes: 'Monthly subscription for accounting software',
    businessId: 'business1'
  }
];

const mockInvoices = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2025-001',
    clientName: 'ABC Corporation',
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    amount: 2500,
    status: 'pending',
    description: 'Consulting services - March 2025',
    businessId: 'business1'
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2025-002',
    clientName: 'XYZ Inc.',
    issueDate: new Date(Date.now() - 1296000000).toISOString(), // 15 days ago
    dueDate: new Date(Date.now() + 1296000000).toISOString(), // 15 days from now
    amount: 1800,
    status: 'pending',
    description: 'Website development - Phase 1',
    businessId: 'business1'
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2025-003',
    clientName: 'Acme Ltd.',
    issueDate: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    dueDate: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
    amount: 3200,
    status: 'paid',
    description: 'Marketing campaign setup',
    businessId: 'business1'
  }
];

// Business transaction categories
export const TRANSACTION_CATEGORIES = {
  income: [
    'Sales',
    'Consulting',
    'Services',
    'Interest',
    'Rental Income',
    'Royalties',
    'Commission',
    'Investments',
    'Other Income'
  ],
  expense: [
    'Rent',
    'Utilities',
    'Salaries',
    'Marketing',
    'Office Supplies',
    'Software',
    'Travel',
    'Meals',
    'Insurance',
    'Taxes',
    'Legal',
    'Maintenance',
    'Equipment',
    'Subscriptions',
    'Professional Fees',
    'Other Expenses'
  ]
};

// Business types
export const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'LLC',
  'Corporation',
  'S Corporation',
  'Nonprofit',
  'Cooperative'
];

// Industry types
export const INDUSTRY_TYPES = [
  'Agriculture',
  'Construction',
  'Manufacturing',
  'Transportation',
  'Retail',
  'Finance',
  'Real Estate',
  'Technology',
  'Healthcare',
  'Education',
  'Hospitality',
  'Services',
  'Consulting',
  'Media',
  'Entertainment',
  'Other'
];

// Create the Business Provider component
export const BusinessProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { registerError, clearError } = useError();
  
  // State
  const [businesses, setBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [businessTransactions, setBusinessTransactions] = useState([]);
  const [businessInvoices, setBusinessInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(process.env.NODE_ENV === 'development');
  
  // Fetch user's businesses
  const fetchBusinesses = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    clearError('business');
    
    try {
      // For development: Use mock data
      if (useMockData) {
        setTimeout(() => {
          setBusinesses(MOCK_BUSINESSES);
          setLoading(false);
        }, 500);
        return;
      }
      
      // For production: Use Firebase
      const businessesRef = collection(db, 'users', currentUser.uid, 'businesses');
      const q = query(businessesRef);
      
      const snapshot = await getDocs(q);
      const businessesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setBusinesses(businessesList);
    } catch (err) {
      console.error('Error fetching businesses:', err);
      registerError('business', { 
        message: 'Failed to load businesses', 
        details: err.message 
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Load business data (transactions, invoices, etc.)
  const loadBusinessData = useCallback(async (businessId) => {
    if (!currentUser || !businessId) return;
    
    setLoading(true);
    clearError('business-data');
    
    try {
      // For development: Use mock data
      if (useMockData) {
        setTimeout(() => {
          const transactions = mockTransactions.filter(t => t.businessId === businessId);
          const invoices = mockInvoices.filter(i => i.businessId === businessId);
          
          setBusinessTransactions(transactions);
          setBusinessInvoices(invoices);
          setLoading(false);
        }, 800);
        return;
      }
      
      // For production: Use Firebase
      // Fetch transactions
      const transactionsRef = collection(db, 'users', currentUser.uid, 'businesses', businessId, 'transactions');
      const transactionsQuery = query(transactionsRef, orderBy('date', 'desc'));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch invoices
      const invoicesRef = collection(db, 'users', currentUser.uid, 'businesses', businessId, 'invoices');
      const invoicesQuery = query(invoicesRef, orderBy('issueDate', 'desc'));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      const invoices = invoicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setBusinessTransactions(transactions);
      setBusinessInvoices(invoices);
    } catch (err) {
      console.error('Error loading business data:', err);
      registerError('business-data', { 
        message: 'Failed to load business data', 
        details: err.message 
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Create a new business
  const createBusiness = useCallback(async (businessData) => {
    if (!currentUser) return null;
    
    setLoading(true);
    clearError('create-business');
    
    try {
      // For development: Mock creation
      if (useMockData) {
        const newBusiness = {
          id: `biz-${Date.now()}`,
          ...businessData,
          createdAt: new Date().toISOString()
        };
        
        setTimeout(() => {
          setBusinesses(prev => [...prev, newBusiness]);
          setLoading(false);
        }, 500);
        
        return newBusiness;
      }
      
      // For production: Use Firebase
      const businessesRef = collection(db, 'users', currentUser.uid, 'businesses');
      const docRef = await addDoc(businessesRef, {
        ...businessData,
        createdAt: new Date().toISOString()
      });
      
      const newBusiness = {
        id: docRef.id,
        ...businessData,
        createdAt: new Date().toISOString()
      };
      
      setBusinesses(prev => [...prev, newBusiness]);
      return newBusiness;
    } catch (err) {
      console.error('Error creating business:', err);
      registerError('create-business', { 
        message: 'Failed to create business', 
        details: err.message 
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Update a business
  const updateBusiness = useCallback(async (businessId, businessData) => {
    if (!currentUser || !businessId) return false;
    
    setLoading(true);
    clearError('update-business');
    
    try {
      // For development: Mock update
      if (useMockData) {
        setTimeout(() => {
          setBusinesses(prev => prev.map(business => 
            business.id === businessId 
              ? { ...business, ...businessData, id: businessId }
              : business
          ));
          
          if (currentBusiness?.id === businessId) {
            setCurrentBusiness(prev => ({ ...prev, ...businessData }));
          }
          
          setLoading(false);
        }, 500);
        
        return true;
      }
      
      // For production: Use Firebase
      const businessRef = doc(db, 'users', currentUser.uid, 'businesses', businessId);
      await updateDoc(businessRef, businessData);
      
      // Update state
      setBusinesses(prev => prev.map(business => 
        business.id === businessId 
          ? { ...business, ...businessData }
          : business
      ));
      
      if (currentBusiness?.id === businessId) {
        setCurrentBusiness(prev => ({ ...prev, ...businessData }));
      }
      
      return true;
    } catch (err) {
      console.error('Error updating business:', err);
      registerError('update-business', { 
        message: 'Failed to update business', 
        details: err.message 
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentBusiness, registerError, clearError, useMockData]);
  
  // Delete a business
  const deleteBusiness = useCallback(async (businessId) => {
    if (!currentUser || !businessId) return false;
    
    setLoading(true);
    clearError('delete-business');
    
    try {
      // For development: Mock delete
      if (useMockData) {
        setTimeout(() => {
          setBusinesses(prev => prev.filter(business => business.id !== businessId));
          
          if (currentBusiness?.id === businessId) {
            setCurrentBusiness(null);
          }
          
          setLoading(false);
        }, 500);
        
        return true;
      }
      
      // For production: Use Firebase
      const businessRef = doc(db, 'users', currentUser.uid, 'businesses', businessId);
      await deleteDoc(businessRef);
      
      // Update state
      setBusinesses(prev => prev.filter(business => business.id !== businessId));
      
      if (currentBusiness?.id === businessId) {
        setCurrentBusiness(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting business:', err);
      registerError('delete-business', { 
        message: 'Failed to delete business', 
        details: err.message 
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentBusiness, registerError, clearError, useMockData]);
  
  // Add transaction
  const addTransaction = useCallback(async (businessId, transactionData) => {
    if (!currentUser || !businessId) return null;
    
    setLoading(true);
    clearError('add-transaction');
    
    try {
      const now = new Date().toISOString();
      const completeTransaction = {
        ...transactionData,
        businessId,
        createdAt: now
      };
      
      // For development: Mock add
      if (useMockData) {
        const newTransaction = {
          id: `tr-${Date.now()}`,
          ...completeTransaction
        };
        
        setTimeout(() => {
          setBusinessTransactions(prev => [newTransaction, ...prev]);
          setLoading(false);
        }, 500);
        
        return newTransaction;
      }
      
      // For production: Use Firebase
      const transactionsRef = collection(db, 'users', currentUser.uid, 'businesses', businessId, 'transactions');
      const docRef = await addDoc(transactionsRef, completeTransaction);
      
      const newTransaction = {
        id: docRef.id,
        ...completeTransaction
      };
      
      setBusinessTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      console.error('Error adding transaction:', err);
      registerError('add-transaction', { 
        message: 'Failed to add transaction', 
        details: err.message 
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Delete transaction
  const deleteTransaction = useCallback(async (businessId, transactionId) => {
    if (!currentUser || !businessId || !transactionId) return false;
    
    setLoading(true);
    clearError('delete-transaction');
    
    try {
      // For development: Mock delete
      if (useMockData) {
        setTimeout(() => {
          setBusinessTransactions(prev => 
            prev.filter(transaction => transaction.id !== transactionId)
          );
          setLoading(false);
        }, 500);
        
        return true;
      }
      
      // For production: Use Firebase
      const transactionRef = doc(db, 'users', currentUser.uid, 'businesses', businessId, 'transactions', transactionId);
      await deleteDoc(transactionRef);
      
      setBusinessTransactions(prev => 
        prev.filter(transaction => transaction.id !== transactionId)
      );
      
      return true;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      registerError('delete-transaction', { 
        message: 'Failed to delete transaction', 
        details: err.message 
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Create invoice
  const createInvoice = useCallback(async (businessId, invoiceData) => {
    if (!currentUser || !businessId) return null;
    
    setLoading(true);
    clearError('create-invoice');
    
    try {
      const now = new Date().toISOString();
      const completeInvoice = {
        ...invoiceData,
        businessId,
        createdAt: now,
        status: invoiceData.status || 'draft'
      };
      
      // For development: Mock create
      if (useMockData) {
        const newInvoice = {
          id: `inv-${Date.now()}`,
          ...completeInvoice
        };
        
        setTimeout(() => {
          setBusinessInvoices(prev => [newInvoice, ...prev]);
          setLoading(false);
        }, 500);
        
        return newInvoice;
      }
      
      // For production: Use Firebase
      const invoicesRef = collection(db, 'users', currentUser.uid, 'businesses', businessId, 'invoices');
      const docRef = await addDoc(invoicesRef, completeInvoice);
      
      const newInvoice = {
        id: docRef.id,
        ...completeInvoice
      };
      
      setBusinessInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    } catch (err) {
      console.error('Error creating invoice:', err);
      registerError('create-invoice', { 
        message: 'Failed to create invoice', 
        details: err.message 
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Update invoice
  const updateInvoice = useCallback(async (businessId, invoiceId, invoiceData) => {
    if (!currentUser || !businessId || !invoiceId) return false;
    
    setLoading(true);
    clearError('update-invoice');
    
    try {
      // For development: Mock update
      if (useMockData) {
        setTimeout(() => {
          setBusinessInvoices(prev => prev.map(invoice => 
            invoice.id === invoiceId 
              ? { ...invoice, ...invoiceData, id: invoiceId }
              : invoice
          ));
          setLoading(false);
        }, 500);
        
        return true;
      }
      
      // For production: Use Firebase
      const invoiceRef = doc(db, 'users', currentUser.uid, 'businesses', businessId, 'invoices', invoiceId);
      await updateDoc(invoiceRef, invoiceData);
      
      setBusinessInvoices(prev => prev.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, ...invoiceData }
          : invoice
      ));
      
      return true;
    } catch (err) {
      console.error('Error updating invoice:', err);
      registerError('update-invoice', { 
        message: 'Failed to update invoice', 
        details: err.message 
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Delete invoice
  const deleteInvoice = useCallback(async (businessId, invoiceId) => {
    if (!currentUser || !businessId || !invoiceId) return false;
    
    setLoading(true);
    clearError('delete-invoice');
    
    try {
      // For development: Mock delete
      if (useMockData) {
        setTimeout(() => {
          setBusinessInvoices(prev => 
            prev.filter(invoice => invoice.id !== invoiceId)
          );
          setLoading(false);
        }, 500);
        
        return true;
      }
      
      // For production: Use Firebase
      const invoiceRef = doc(db, 'users', currentUser.uid, 'businesses', businessId, 'invoices', invoiceId);
      await deleteDoc(invoiceRef);
      
      setBusinessInvoices(prev => 
        prev.filter(invoice => invoice.id !== invoiceId)
      );
      
      return true;
    } catch (err) {
      console.error('Error deleting invoice:', err);
      registerError('delete-invoice', { 
        message: 'Failed to delete invoice', 
        details: err.message 
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, registerError, clearError, useMockData]);
  
  // Calculate financial summary (for dashboard)
  const calculateFinancialSummary = useCallback((transactions, invoices) => {
    try {
      // Initialize summary object
      const summary = {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        cashFlow: 0,
        outstandingInvoices: 0
      };
      
      // Calculate revenue and expenses from transactions
      if (transactions && transactions.length > 0) {
        transactions.forEach(transaction => {
          if (transaction.type === 'income') {
            summary.totalRevenue += parseFloat(transaction.amount);
          } else if (transaction.type === 'expense') {
            summary.totalExpenses += parseFloat(transaction.amount);
          }
        });
      }
      
      // Calculate outstanding invoices
      if (invoices && invoices.length > 0) {
        invoices.forEach(invoice => {
          if (invoice.status === 'pending' || invoice.status === 'overdue') {
            summary.outstandingInvoices += parseFloat(invoice.total);
          }
        });
      }
      
      // Calculate net profit and cash flow
      summary.netProfit = summary.totalRevenue - summary.totalExpenses;
      summary.cashFlow = summary.netProfit; // Simplified version
      
      return summary;
    } catch (err) {
      console.error('Error calculating financial summary:', err);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        cashFlow: 0,
        outstandingInvoices: 0
      };
    }
  }, []);
  
  // Load user businesses on initial mount and when user changes
  useEffect(() => {
    if (currentUser) {
      fetchBusinesses();
    } else {
      setBusinesses([]);
      setCurrentBusiness(null);
      setBusinessTransactions([]);
      setBusinessInvoices([]);
    }
  }, [currentUser, fetchBusinesses]);
  
  // Context value
  const value = {
    businesses,
    currentBusiness,
    setCurrentBusiness,
    businessTransactions,
    businessInvoices,
    loading,
    useMockData,
    
    // Methods
    fetchBusinesses,
    loadBusinessData,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    addTransaction,
    deleteTransaction,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    calculateFinancialSummary,
    
    // Constants
    TRANSACTION_CATEGORIES,
    BUSINESS_TYPES,
    INDUSTRY_TYPES
  };
  
  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

// Custom hook to use the business context
export const useBusiness = () => {
  return useContext(BusinessContext);
};

export default BusinessContext;
