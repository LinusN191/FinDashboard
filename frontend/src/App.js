import React from 'react';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ModeProvider } from './context/ModeContext';
import { InvestmentProvider } from './context/InvestmentContext';
import { BusinessProvider } from './context/BusinessContext';
import { GroupProvider } from './context/GroupContext';

// Layout Component
import AppLayout from './components/Layout/AppLayout';

// Auth Components
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import PrivateRoute from './components/Auth/PrivateRoute';

// Mode Selection Page
import ModeSelectPage from './pages/mode-select';

// Personal Finance Pages
import Dashboard from './pages/dashboard';
import TransactionsPage from './pages/transactions';
import BudgetPage from './pages/budget';
import ExpensesPage from './pages/expenses';
import InvestmentsPage from './pages/investments';
import TradingPage from './pages/trading';
import GoalsPage from './pages/goals';

// Business Finance Pages
import BusinessDashboard from './pages/business';

// Group Investment Pages
import GroupDashboard from './pages/group';

// Settings and Other Pages
import SettingsPage from './pages/settings';

// Custom theme (if needed)
import theme from './styles/theme';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <AuthProvider>
        <ModeProvider>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Mode Selection - First page after login */}
              <Route 
                path="/mode-select" 
                element={
                  <PrivateRoute>
                    <ModeSelectPage />
                  </PrivateRoute>
                } 
              />
              
              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Routes>
                        {/* Home Redirect - Now goes to mode select first */}
                        <Route path="/" element={<Navigate to="/mode-select" replace />} />
                        
                        {/* Personal Finance Routes */}
                        <Route path="/dashboard" element={
                          <InvestmentProvider>
                            <Dashboard />
                          </InvestmentProvider>
                        } />
                        <Route path="/transactions" element={<TransactionsPage />} />
                        <Route path="/budget" element={<BudgetPage />} />
                        <Route path="/expenses" element={<ExpensesPage />} />
                        <Route path="/investments" element={
                          <InvestmentProvider>
                            <InvestmentsPage />
                          </InvestmentProvider>
                        } />
                        <Route path="/trading" element={<TradingPage />} />
                        <Route path="/goals" element={<GoalsPage />} />
                        
                        {/* Business Finance Routes */}
                        <Route path="/business/*" element={
                          <BusinessProvider>
                            <Routes>
                              <Route path="/" element={<BusinessDashboard />} />
                              <Route path="/transactions" element={<Navigate to="/business" replace />} />
                              <Route path="/invoices" element={<Navigate to="/business" replace />} />
                              <Route path="/expenses" element={<Navigate to="/business" replace />} />
                              <Route path="/reports" element={<Navigate to="/business" replace />} />
                              <Route path="/entities" element={<Navigate to="/business" replace />} />
                              <Route path="/clients" element={<Navigate to="/business" replace />} />
                              <Route path="/goals" element={<Navigate to="/business" replace />} />
                            </Routes>
                          </BusinessProvider>
                        } />
                        
                        {/* Group Investment Routes */}
                        <Route path="/group/*" element={
                          <GroupProvider>
                            <Routes>
                              <Route path="/" element={<GroupDashboard />} />
                              <Route path="/members" element={<Navigate to="/group" replace />} />
                              <Route path="/contributions" element={<Navigate to="/group" replace />} />
                              <Route path="/investments" element={<Navigate to="/group" replace />} />
                              <Route path="/performance" element={<Navigate to="/group" replace />} />
                            </Routes>
                          </GroupProvider>
                        } />
                        
                        {/* Settings and Other Routes */}
                        <Route path="/settings" element={<SettingsPage />} />
                        
                        {/* Fallback Route */}
                        <Route path="*" element={<Navigate to="/mode-select" replace />} />
                      </Routes>
                    </AppLayout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </ModeProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
