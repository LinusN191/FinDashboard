import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { isUsingMockFirebase } from '../utils/firebase';

const FinanceContext = createContext({});

export const useFinance = () => useContext(FinanceContext);

// Mock data for development
const mockData = {
  dashboard_summary: {
    total_income: 5000,
    total_expenses: 3200,
    total_savings: 1800,
    total_investments: 15000,
    total_debts: 8000,
    net_worth: 7000,
    budget_utilization: 64,
    expense_categories: [
      { category: 'Housing', amount: 1200, percentage: 37.5 },
      { category: 'Food', amount: 600, percentage: 18.75 },
      { category: 'Transportation', amount: 400, percentage: 12.5 },
      { category: 'Entertainment', amount: 300, percentage: 9.38 },
      { category: 'Utilities', amount: 250, percentage: 7.81 },
      { category: 'Other', amount: 450, percentage: 14.06 }
    ],
    recent_transactions: [
      { id: 'mock-1', date: '2025-03-15', description: 'Grocery Store', amount: -120, category: 'Food' },
      { id: 'mock-2', date: '2025-03-14', description: 'Salary Deposit', amount: 2500, category: 'Income' },
      { id: 'mock-3', date: '2025-03-12', description: 'Electric Bill', amount: -85, category: 'Utilities' },
      { id: 'mock-4', date: '2025-03-10', description: 'Restaurant', amount: -65, category: 'Food' },
      { id: 'mock-5', date: '2025-03-08', description: 'Gas Station', amount: -45, category: 'Transportation' }
    ]
  },
  budgets: [
    { id: 'budget-1', name: 'Housing', amount: 1200, spent: 1200, remaining: 0, period: 'monthly' },
    { id: 'budget-2', name: 'Food', amount: 700, spent: 600, remaining: 100, period: 'monthly' },
    { id: 'budget-3', name: 'Transportation', amount: 500, spent: 400, remaining: 100, period: 'monthly' },
    { id: 'budget-4', name: 'Entertainment', amount: 300, spent: 300, remaining: 0, period: 'monthly' },
    { id: 'budget-5', name: 'Utilities', amount: 300, spent: 250, remaining: 50, period: 'monthly' },
    { id: 'budget-6', name: 'Shopping', amount: 400, spent: 350, remaining: 50, period: 'monthly' },
    { id: 'budget-7', name: 'Health', amount: 200, spent: 150, remaining: 50, period: 'monthly' }
  ],
  expenses: [
    { id: 'exp-1', date: '2025-03-15', description: 'Rent Payment', amount: 1200, category: 'Housing', recurring: true },
    { id: 'exp-2', date: '2025-03-14', description: 'Grocery Store', amount: 120, category: 'Food', recurring: false },
    { id: 'exp-3', date: '2025-03-12', description: 'Electricity Bill', amount: 85, category: 'Utilities', recurring: true },
    { id: 'exp-4', date: '2025-03-10', description: 'Gas Station', amount: 45, category: 'Transportation', recurring: false },
    { id: 'exp-5', date: '2025-03-08', description: 'Phone Bill', amount: 60, category: 'Utilities', recurring: true },
    { id: 'exp-6', date: '2025-03-05', description: 'Restaurant', amount: 65, category: 'Food', recurring: false },
    { id: 'exp-7', date: '2025-03-03', description: 'Movie Tickets', amount: 30, category: 'Entertainment', recurring: false },
    { id: 'exp-8', date: '2025-03-01', description: 'Internet Bill', amount: 75, category: 'Utilities', recurring: true }
  ],
  debts: [
    { id: 'debt-1', name: 'Student Loan', balance: 5000, interest_rate: 4.5, minimum_payment: 120, due_date: '2025-04-15' },
    { id: 'debt-2', name: 'Car Loan', balance: 3000, interest_rate: 3.2, minimum_payment: 200, due_date: '2025-04-10' }
  ],
  savings_goals: [
    { id: 'goal-1', name: 'Emergency Fund', target_amount: 10000, current_amount: 5000, target_date: '2025-12-31', priority: 'high' },
    { id: 'goal-2', name: 'Vacation', target_amount: 3000, current_amount: 1200, target_date: '2025-08-15', priority: 'medium' },
    { id: 'goal-3', name: 'New Laptop', target_amount: 1500, current_amount: 800, target_date: '2025-06-30', priority: 'low' }
  ],
  investment_plans: [
    { id: 'invest-1', name: 'Retirement', amount: 10000, allocation: [
      { asset_class: 'Stocks', percentage: 70 },
      { asset_class: 'Bonds', percentage: 25 },
      { asset_class: 'Cash', percentage: 5 }
    ]},
    { id: 'invest-2', name: 'Education Fund', amount: 5000, allocation: [
      { asset_class: 'Stocks', percentage: 50 },
      { asset_class: 'Bonds', percentage: 40 },
      { asset_class: 'Cash', percentage: 10 }
    ]}
  ]
};

export const FinanceProvider = ({ children }) => {
  const { currentUser, usingMockAuth } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [investmentPlans, setInvestmentPlans] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useMockData, setUseMockData] = useState(false);

  // Set up mock data in development mode
  useEffect(() => {
    const isMockMode = isUsingMockFirebase() || usingMockAuth;
    setUseMockData(isMockMode);
    
    if (isMockMode) {
      console.log('FinanceContext: Initialized in explicit mock data mode. API calls will be simulated.');
    } else {
      console.log('FinanceContext: Initialized to use live API data.');
    }
  }, [usingMockAuth]);

  // Get auth token for API requests
  const getAuthHeader = async () => {
    if (currentUser) {
      const token = await currentUser.getIdToken();
      return {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
    }
    return {};
  };

  // Fetch dashboard summary
  const fetchDashboardSummary = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('fetchDashboardSummary: Using mock data due to explicit mock mode.');
        setDashboardSummary(mockData.dashboard_summary);
        return mockData.dashboard_summary;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/dashboard-summary', authHeader);
      setDashboardSummary(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      if (useMockData) { // This block should ideally not be hit if API calls are skipped in mock mode
        setError('Using mock dashboard summary due to explicit mock mode after a fetch attempt.');
        setDashboardSummary(mockData.dashboard_summary);
        return mockData.dashboard_summary;
      } else {
        setError(`Failed to fetch dashboard summary: ${err.message}. Real data could not be retrieved.`);
        // Do not setDashboardSummary(mockData.dashboard_summary) here
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch budgets
  const fetchBudgets = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('fetchBudgets: Using mock data due to explicit mock mode.');
        setBudgets(mockData.budgets);
        return mockData.budgets;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/budgets', authHeader);
      setBudgets(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching budgets:', err);
      if (useMockData) {
        setError('Using mock budgets due to explicit mock mode after a fetch attempt.');
        setBudgets(mockData.budgets);
        return mockData.budgets;
      } else {
        setError(`Failed to fetch budgets: ${err.message}. Real data could not be retrieved.`);
        // Do not setBudgets(mockData.budgets) here
      }
    } finally {
      setLoading(false);
    }
  };

  // Create budget
  const createBudget = async (budgetData) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('createBudget: Simulating budget creation in mock mode.');
        const newBudget = {
          id: `budget-${Date.now()}`,
          ...budgetData,
          spent: 0,
          remaining: budgetData.amount
        };
        setBudgets([...budgets, newBudget]);
        return newBudget;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/finance/budgets', budgetData, authHeader);
      setBudgets([...budgets, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error creating budget:', err);
      setError(`Failed to create budget: ${err.message}`);
      throw err; // Re-throw for the component to handle
    } finally {
      setLoading(false);
    }
  };

  // Fetch expenses
  const fetchExpenses = async (filters = {}) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('fetchExpenses: Using mock data due to explicit mock mode.');
        setExpenses(mockData.expenses);
        return mockData.expenses;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/expenses', {
        ...authHeader,
        params: filters
      });
      setExpenses(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching expenses:', err);
      if (useMockData) {
        setError('Using mock expenses due to explicit mock mode after a fetch attempt.');
        setExpenses(mockData.expenses);
        return mockData.expenses;
      } else {
        setError(`Failed to fetch expenses: ${err.message}. Real data could not be retrieved.`);
        // Do not setExpenses(mockData.expenses) here
      }
    } finally {
      setLoading(false);
    }
  };

  // Create expense
  const createExpense = async (expenseData) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('createExpense: Simulating expense creation in mock mode.');
        const newExpense = {
          id: `exp-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          ...expenseData
        };
        setExpenses([...expenses, newExpense]);
        return newExpense;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/finance/expenses', expenseData, authHeader);
      setExpenses([...expenses, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error creating expense:', err);
      setError(`Failed to create expense: ${err.message}`);
      throw err; // Re-throw for the component to handle
    } finally {
      setLoading(false);
    }
  };

  // Fetch debts
  const fetchDebts = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('fetchDebts: Using mock data due to explicit mock mode.');
        setDebts(mockData.debts);
        return mockData.debts;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/debts', authHeader);
      setDebts(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching debts:', err);
      if (useMockData) {
        setError('Using mock debts due to explicit mock mode after a fetch attempt.');
        setDebts(mockData.debts);
        return mockData.debts;
      } else {
        setError(`Failed to fetch debts: ${err.message}. Real data could not be retrieved.`);
        // Do not setDebts(mockData.debts) here
      }
    } finally {
      setLoading(false);
    }
  };

  // Create debt
  const createDebt = async (debtData) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('createDebt: Simulating debt creation in mock mode.');
        const newDebt = {
          id: `debt-${Date.now()}`,
          ...debtData
        };
        setDebts([...debts, newDebt]);
        return newDebt;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/finance/debts', debtData, authHeader);
      setDebts([...debts, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error creating debt:', err);
      setError(`Failed to create debt: ${err.message}`);
      throw err; // Re-throw for the component to handle
    } finally {
      setLoading(false);
    }
  };

  // Get debt payoff strategy
  const getDebtPayoffStrategy = async (debtId, additionalPayment = 0) => {
    if (!currentUser) return null;
    
    try {
      // Use mock data in development
      if (useMockData) {
        const debt = debts.find(d => d.id === debtId);
        if (!debt) return null;
        
        const monthsToPayoff = Math.ceil(debt.balance / (debt.minimum_payment + additionalPayment));
        const totalInterest = (debt.balance * (debt.interest_rate / 100) * (monthsToPayoff / 12));
        
        return {
          months_to_payoff: monthsToPayoff,
          total_interest: totalInterest,
          total_payment: debt.balance + totalInterest,
          monthly_payment: debt.minimum_payment + additionalPayment,
          payoff_date: new Date(Date.now() + monthsToPayoff * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get(
        `/api/finance/debt-payoff-strategy/${debtId}`, 
        {
          ...authHeader,
          params: { additional_payment: additionalPayment }
        }
      );
      return response.data;
    } catch (err) {
      setError('Failed to get debt payoff strategy');
      console.error(err);
      return null;
    }
  };

  // Fetch savings goals
  const fetchSavingsGoals = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('fetchSavingsGoals: Using mock data due to explicit mock mode.');
        setSavingsGoals(mockData.savings_goals);
        return mockData.savings_goals;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/savings-goals', authHeader);
      setSavingsGoals(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching savings goals:', err);
      if (useMockData) {
        setError('Using mock savings goals due to explicit mock mode after a fetch attempt.');
        setSavingsGoals(mockData.savings_goals);
        return mockData.savings_goals;
      } else {
        setError(`Failed to fetch savings goals: ${err.message}. Real data could not be retrieved.`);
        // Do not setSavingsGoals(mockData.savings_goals) here
      }
    } finally {
      setLoading(false);
    }
  };

  // Create savings goal
  const createSavingsGoal = async (goalData) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('createSavingsGoal: Simulating savings goal creation in mock mode.');
        const newGoal = {
          id: `goal-${Date.now()}`,
          current_amount: 0,
          ...goalData
        };
        setSavingsGoals([...savingsGoals, newGoal]);
        return newGoal;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/finance/savings-goals', goalData, authHeader);
      setSavingsGoals([...savingsGoals, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error creating savings goal:', err);
      setError(`Failed to create savings goal: ${err.message}`);
      throw err; // Re-throw for the component to handle
    } finally {
      setLoading(false);
    }
  };

  // Fetch investment plans
  const fetchInvestmentPlans = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('fetchInvestmentPlans: Using mock data due to explicit mock mode.');
        setInvestmentPlans(mockData.investment_plans);
        return mockData.investment_plans;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/investment-plans', authHeader);
      setInvestmentPlans(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching investment plans:', err);
      if (useMockData) {
        setError('Using mock investment plans due to explicit mock mode after a fetch attempt.');
        setInvestmentPlans(mockData.investment_plans);
        return mockData.investment_plans;
      } else {
        setError(`Failed to fetch investment plans: ${err.message}. Real data could not be retrieved.`);
        // Do not setInvestmentPlans(mockData.investment_plans) here
      }
    } finally {
      setLoading(false);
    }
  };

  // Create investment plan
  const createInvestmentPlan = async (planData) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      if (useMockData) {
        console.log('createInvestmentPlan: Simulating investment plan creation in mock mode.');
        const newPlan = {
          id: `invest-${Date.now()}`,
          ...planData
        };
        setInvestmentPlans([...investmentPlans, newPlan]);
        return newPlan;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.post('/api/finance/investment-plans', planData, authHeader);
      setInvestmentPlans([...investmentPlans, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error creating investment plan:', err);
      setError(`Failed to create investment plan: ${err.message}`);
      throw err; // Re-throw for the component to handle
    } finally {
      setLoading(false);
    }
  };

  // Load all financial data
  const loadAllFinanceData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (useMockData) {
        console.log('loadAllFinanceData: Using mock data for initial load due to explicit mock mode.');
        setDashboardSummary(mockData.dashboard_summary);
        setBudgets(mockData.budgets);
        setExpenses(mockData.expenses);
        setDebts(mockData.debts);
        setSavingsGoals(mockData.savings_goals);
        setInvestmentPlans(mockData.investment_plans);
      } else {
        console.log('loadAllFinanceData: Attempting to fetch all live financial data.');
        // Promise.all will stop on the first rejection. 
        // Individual fetch functions already handle their own errors and set specific error messages.
        // If any of these fail, the error state will be set by the specific fetch function.
        await Promise.all([
          fetchDashboardSummary(),
          fetchBudgets(),
          fetchExpenses(),
          fetchDebts(),
          fetchSavingsGoals(),
          fetchInvestmentPlans()
        ]);
        console.log('loadAllFinanceData: Successfully fetched all live financial data.');
      }
    } catch (err) {
      // This catch block will now primarily catch errors from Promise.all if not caught by individual fetches,
      // or if a fetch function re-throws an error that isn't caught by its own try/catch.
      // Individual fetch functions are designed to set their own error messages and not fall back to mock data if useMockData is false.
      console.error('loadAllFinanceData: Error during the process of loading all financial data.', err);
      if (useMockData) {
        // This case should ideally not be reached if individual fetches handle mock data correctly.
        // It's a fallback if something unexpected happens.
        setError('Using mock data for initial load due to explicit mock mode after a failure in Promise.all.');
        setDashboardSummary(mockData.dashboard_summary);
        setBudgets(mockData.budgets);
        setExpenses(mockData.expenses);
        setDebts(mockData.debts);
        setSavingsGoals(mockData.savings_goals);
        setInvestmentPlans(mockData.investment_plans);
      } else {
         // If useMockData is false, and an error occurs in Promise.all, 
         // it means one of the fetches failed and should have set its own error.
         // Set a general error message here if not already set by a specific fetch.
        if (!error) { // Check if an error is already set by a specific fetch
          setError(`Failed to load some essential financial data: ${err.message}. Some parts of your dashboard may be incomplete.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect to load data when user changes
  useEffect(() => {
    if (currentUser) {
      loadAllFinanceData();
    } else {
      // Clear data when user logs out
      setBudgets([]);
      setExpenses([]);
      setDebts([]);
      setSavingsGoals([]);
      setInvestmentPlans([]);
      setDashboardSummary(null);
    }
  }, [currentUser, useMockData]);

  const value = {
    dashboardSummary,
    budgets,
    expenses,
    debts,
    savingsGoals,
    investmentPlans,
    loading,
    error,
    fetchDashboardSummary,
    fetchBudgets,
    createBudget,
    fetchExpenses,
    createExpense,
    fetchDebts,
    createDebt,
    getDebtPayoffStrategy,
    fetchSavingsGoals,
    createSavingsGoal,
    fetchInvestmentPlans,
    createInvestmentPlan,
    loadAllFinanceData,
    useMockData
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export default FinanceContext;
