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
      console.log('Using mock financial data in development mode');
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
      
      // Use mock data in development
      if (useMockData) {
        setDashboardSummary(mockData.dashboard_summary);
        return mockData.dashboard_summary;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/dashboard-summary', authHeader);
      setDashboardSummary(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch dashboard summary');
      console.error(err);
      if (useMockData) {
        setDashboardSummary(mockData.dashboard_summary);
        return mockData.dashboard_summary;
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
      
      // Use mock data in development
      if (useMockData) {
        setBudgets(mockData.budgets);
        return mockData.budgets;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/budgets', authHeader);
      setBudgets(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch budgets');
      console.error(err);
      if (useMockData) {
        setBudgets(mockData.budgets);
        return mockData.budgets;
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
      
      // Use mock data in development
      if (useMockData) {
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
      setError('Failed to create budget');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch expenses
  const fetchExpenses = async (filters = {}) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Use mock data in development
      if (useMockData) {
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
      setError('Failed to fetch expenses');
      console.error(err);
      if (useMockData) {
        setExpenses(mockData.expenses);
        return mockData.expenses;
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
      
      // Use mock data in development
      if (useMockData) {
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
      setError('Failed to create expense');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch debts
  const fetchDebts = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Use mock data in development
      if (useMockData) {
        setDebts(mockData.debts);
        return mockData.debts;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/debts', authHeader);
      setDebts(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch debts');
      console.error(err);
      if (useMockData) {
        setDebts(mockData.debts);
        return mockData.debts;
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
      
      // Use mock data in development
      if (useMockData) {
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
      setError('Failed to create debt');
      console.error(err);
      throw err;
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
      
      // Use mock data in development
      if (useMockData) {
        setSavingsGoals(mockData.savings_goals);
        return mockData.savings_goals;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/savings-goals', authHeader);
      setSavingsGoals(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch savings goals');
      console.error(err);
      if (useMockData) {
        setSavingsGoals(mockData.savings_goals);
        return mockData.savings_goals;
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
      
      // Use mock data in development
      if (useMockData) {
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
      setError('Failed to create savings goal');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch investment plans
  const fetchInvestmentPlans = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Use mock data in development
      if (useMockData) {
        setInvestmentPlans(mockData.investment_plans);
        return mockData.investment_plans;
      }
      
      const authHeader = await getAuthHeader();
      const response = await axios.get('/api/finance/investment-plans', authHeader);
      setInvestmentPlans(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch investment plans');
      console.error(err);
      if (useMockData) {
        setInvestmentPlans(mockData.investment_plans);
        return mockData.investment_plans;
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
      
      // Use mock data in development
      if (useMockData) {
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
      setError('Failed to create investment plan');
      console.error(err);
      throw err;
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
      // Use mock data in development
      if (useMockData) {
        setDashboardSummary(mockData.dashboard_summary);
        setBudgets(mockData.budgets);
        setExpenses(mockData.expenses);
        setDebts(mockData.debts);
        setSavingsGoals(mockData.savings_goals);
        setInvestmentPlans(mockData.investment_plans);
      } else {
        await Promise.all([
          fetchDashboardSummary(),
          fetchBudgets(),
          fetchExpenses(),
          fetchDebts(),
          fetchSavingsGoals(),
          fetchInvestmentPlans()
        ]);
      }
    } catch (err) {
      setError('Failed to load financial data');
      console.error(err);
      
      // Fallback to mock data
      if (useMockData) {
        setDashboardSummary(mockData.dashboard_summary);
        setBudgets(mockData.budgets);
        setExpenses(mockData.expenses);
        setDebts(mockData.debts);
        setSavingsGoals(mockData.savings_goals);
        setInvestmentPlans(mockData.investment_plans);
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
