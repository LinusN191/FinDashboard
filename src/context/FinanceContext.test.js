import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';
import { FinanceProvider, useFinance } from './FinanceContext';
import { useAuth } from './AuthContext';
import { isUsingMockFirebase } from '../utils/firebase';

// Mock dependencies
jest.mock('axios');
jest.mock('./AuthContext');
jest.mock('../utils/firebase');

// Default mock implementations
const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
const mockCurrentUser = {
  uid: 'test-user-id',
  getIdToken: mockGetIdToken,
};

const defaultAuthContextValue = {
  currentUser: mockCurrentUser,
  usingMockAuth: false, // Default to not using mock auth
};

describe('FinanceContext - createBudget', () => {
  beforeEach(() => {
    // Reset mocks before each test
    axios.post.mockReset();
    mockGetIdToken.mockClear();
    isUsingMockFirebase.mockReturnValue(false); // Default to live mode for most tests
    useAuth.mockReturnValue(defaultAuthContextValue);
  });

  const wrapper = ({ children }) => <FinanceProvider>{children}</FinanceProvider>;

  const budgetData = {
    category: 'Food',
    amount: 500,
    period: 'monthly',
    description: 'Groceries for the month',
  };

  it('successfully creates a budget in live mode', async () => {
    const mockResponseData = { id: 'new-budget-1', ...budgetData, spent: 0, remaining: 500 };
    axios.post.mockResolvedValue({ data: mockResponseData });

    const { result, waitForNextUpdate } = renderHook(() => useFinance(), { wrapper });

    let createdBudget;
    await act(async () => {
      createdBudget = await result.current.createBudget(budgetData);
      await waitForNextUpdate(); // Wait for state updates if any
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      '/api/finance/budgets',
      budgetData,
      { headers: { Authorization: `Bearer test-token` } }
    );
    expect(createdBudget).toEqual(mockResponseData);
    // Check if budgets state is updated (optional for pure unit test, but good for context behavior)
    expect(result.current.budgets.some(b => b.id === 'new-budget-1')).toBe(true);
  });

  it('handles API error when creating a budget in live mode', async () => {
    const apiError = new Error('API Error');
    axios.post.mockRejectedValue(apiError);

    const { result } = renderHook(() => useFinance(), { wrapper });

    await expect(result.current.createBudget(budgetData)).rejects.toThrow('API Error');

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      '/api/finance/budgets',
      budgetData,
      { headers: { Authorization: `Bearer test-token` } }
    );
    // Ensure error state is set in context
    expect(result.current.error).toBe('Failed to create budget: API Error');
  });

  it('creates a budget in mock mode without calling API', async () => {
    isUsingMockFirebase.mockReturnValue(true); // Enable mock mode

    const { result, waitForNextUpdate } = renderHook(() => useFinance(), { wrapper });
    
    // If usingMockAuth also contributes to mock mode, ensure it's set if necessary
    // useAuth.mockReturnValue({ ...defaultAuthContextValue, usingMockAuth: true });
    // Re-render or ensure the hook picks up the new auth context if it's critical for this test.
    // For this specific test, isUsingMockFirebase=true should be enough based on FinanceContext logic.

    let createdBudget;
    await act(async () => {
      createdBudget = await result.current.createBudget(budgetData);
      // await waitForNextUpdate(); // May not be needed if state update is synchronous for mock
    });
    
    expect(axios.post).not.toHaveBeenCalled();
    expect(createdBudget).toBeDefined();
    expect(createdBudget.category).toBe(budgetData.category);
    expect(createdBudget.amount).toBe(budgetData.amount);
    expect(createdBudget.id).toMatch(/^budget-/); // Mock ID format
    expect(createdBudget.spent).toBe(0);
    expect(createdBudget.remaining).toBe(budgetData.amount);

    // Check if budgets state is updated
    expect(result.current.budgets.some(b => b.id === createdBudget.id)).toBe(true);
     // Check that useMockData state is true
    expect(result.current.useMockData).toBe(true); 
  });
  
  it('does not call API if there is no current user', async () => {
    useAuth.mockReturnValue({ currentUser: null, usingMockAuth: false });

    const { result } = renderHook(() => useFinance(), { wrapper });

    let createdBudget;
    await act(async () => {
      createdBudget = await result.current.createBudget(budgetData);
    });
    
    expect(axios.post).not.toHaveBeenCalled();
    expect(createdBudget).toBeUndefined(); // Or null, depending on implementation
    // Optionally, check if an error is set or a console warning occurs, if applicable
  });

  // Additional test for when usingMockAuth is true, leading to useMockData = true
  it('creates a budget in mock mode when usingMockAuth is true', async () => {
    // isUsingMockFirebase can be false, but usingMockAuth = true should also trigger mock data mode
    isUsingMockFirebase.mockReturnValue(false); 
    useAuth.mockReturnValue({ ...defaultAuthContextValue, usingMockAuth: true });

    const { result, waitForNextUpdate } = renderHook(() => useFinance(), { wrapper });
    
    // The useEffect in FinanceProvider sets useMockData based on isUsingMockFirebase() || usingMockAuth
    // We need to wait for this effect to run and update the internal useMockData state
    await act(async () => {
        // This initial call to loadAllFinanceData or any other function might trigger the useEffect
        // or we can just wait for the hook to stabilize if it runs on mount.
        // For this test, the crucial part is that useMockData becomes true.
        // Let's ensure the effect has run.
        await new Promise(resolve => setTimeout(resolve, 0)); // wait for useEffect to run
    });

    expect(result.current.useMockData).toBe(true); // Verify that mock mode is active

    let createdBudget;
    await act(async () => {
      createdBudget = await result.current.createBudget(budgetData);
    });
    
    expect(axios.post).not.toHaveBeenCalled();
    expect(createdBudget).toBeDefined();
    expect(createdBudget.category).toBe(budgetData.category);
    expect(createdBudget.id).toMatch(/^budget-/);
    expect(result.current.budgets.some(b => b.id === createdBudget.id)).toBe(true);
  });

});
