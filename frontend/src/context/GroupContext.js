import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';

// Create context
const GroupContext = createContext();

// Mock data for development
const MOCK_GROUPS = [
  {
    id: 'group-1',
    name: 'Investment Circle',
    description: 'A group of friends pooling resources for investment opportunities',
    createdAt: new Date().toISOString(),
    members: [
      { id: 'user-1', name: 'John Doe', role: 'admin', joinedAt: new Date().toISOString() },
      { id: 'user-2', name: 'Jane Smith', role: 'member', joinedAt: new Date().toISOString() }
    ],
    contributionAmount: 5000,
    contributionFrequency: 'monthly',
    active: true
  },
  {
    id: 'group-2',
    name: 'Real Estate Collective',
    description: 'Group focused on real estate investments',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    members: [
      { id: 'user-1', name: 'John Doe', role: 'member', joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'user-3', name: 'Mike Johnson', role: 'admin', joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    contributionAmount: 10000,
    contributionFrequency: 'quarterly',
    active: true
  }
];

const MOCK_CONTRIBUTIONS = [
  {
    id: 'contrib-1',
    groupId: 'group-1',
    userId: 'user-1',
    amount: 5000,
    date: new Date().toISOString(),
    status: 'completed',
    paymentMethod: 'bank transfer'
  },
  {
    id: 'contrib-2',
    groupId: 'group-1',
    userId: 'user-2',
    amount: 5000,
    date: new Date().toISOString(),
    status: 'completed',
    paymentMethod: 'mobile payment'
  },
  {
    id: 'contrib-3',
    groupId: 'group-1',
    userId: 'user-1',
    amount: 5000,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    paymentMethod: 'bank transfer'
  }
];

const MOCK_INVESTMENTS = [
  {
    id: 'invest-1',
    groupId: 'group-1',
    name: 'Tech Stock Portfolio',
    type: 'stocks',
    amount: 15000,
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Investment in tech stocks including AAPL, MSFT, and GOOGL',
    status: 'active',
    returns: 1200,
    returnsPercentage: 8
  },
  {
    id: 'invest-2',
    groupId: 'group-2',
    name: 'Downtown Apartment',
    type: 'real estate',
    amount: 50000,
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Investment in a downtown apartment for rental income',
    status: 'active',
    returns: 5000,
    returnsPercentage: 10
  }
];

// Provider component
export const GroupProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupContributions, setGroupContributions] = useState([]);
  const [groupInvestments, setGroupInvestments] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  
  // Define investment types and categories
  const INVESTMENT_TYPES = [
    'stocks',
    'bonds',
    'real estate',
    'mutual funds',
    'etfs',
    'cryptocurrencies',
    'commodities',
    'business venture',
    'other'
  ];
  
  const CONTRIBUTION_FREQUENCIES = [
    'weekly',
    'bi-weekly',
    'monthly',
    'quarterly',
    'annually',
    'one-time'
  ];
  
  // Fetch user's groups
  const fetchGroups = useCallback(async () => {
    if (!currentUser) {
      setGroups([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In development mode, use mock data
      if (process.env.NODE_ENV === 'development') {
        setGroups(MOCK_GROUPS);
        setLoading(false);
        return;
      }
      
      // In production, fetch from Firestore
      const groupsRef = firestore.collection('groups');
      const userGroupsQuery = groupsRef.where('members', 'array-contains', currentUser.uid);
      
      const snapshot = await userGroupsQuery.get();
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setGroups(groupsData);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to fetch groups. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Load group data (contributions, investments, members)
  const loadGroupData = useCallback(async (groupId) => {
    if (!currentUser || !groupId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In development mode, use mock data
      if (process.env.NODE_ENV === 'development') {
        const contributions = MOCK_CONTRIBUTIONS.filter(c => c.groupId === groupId);
        const investments = MOCK_INVESTMENTS.filter(i => i.groupId === groupId);
        const group = MOCK_GROUPS.find(g => g.id === groupId);
        const members = group ? group.members : [];
        
        setGroupContributions(contributions);
        setGroupInvestments(investments);
        setGroupMembers(members);
        setLoading(false);
        return;
      }
      
      // In production, fetch from Firestore
      // Fetch contributions
      const contributionsRef = firestore.collection('groups').doc(groupId).collection('contributions');
      const contributionsSnapshot = await contributionsRef.get();
      const contributionsData = contributionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch investments
      const investmentsRef = firestore.collection('groups').doc(groupId).collection('investments');
      const investmentsSnapshot = await investmentsRef.get();
      const investmentsData = investmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch members
      const groupRef = firestore.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();
      const groupData = groupDoc.data();
      const membersData = groupData.members || [];
      
      setGroupContributions(contributionsData);
      setGroupInvestments(investmentsData);
      setGroupMembers(membersData);
    } catch (err) {
      console.error('Error loading group data:', err);
      setError('Failed to load group data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Create a new group
  const createGroup = useCallback(async (groupData) => {
    if (!currentUser) return null;
    
    try {
      // In development mode, simulate creation
      if (process.env.NODE_ENV === 'development') {
        const newGroup = {
          id: `group-${Date.now()}`,
          ...groupData,
          createdAt: new Date().toISOString(),
          members: [
            { id: currentUser.uid, name: currentUser.displayName || 'Current User', role: 'admin', joinedAt: new Date().toISOString() }
          ]
        };
        
        setGroups(prev => [...prev, newGroup]);
        return newGroup;
      }
      
      // In production, save to Firestore
      const groupRef = firestore.collection('groups').doc();
      const newGroup = {
        ...groupData,
        createdAt: new Date().toISOString(),
        members: [
          { id: currentUser.uid, name: currentUser.displayName || 'Current User', role: 'admin', joinedAt: new Date().toISOString() }
        ]
      };
      
      await groupRef.set(newGroup);
      
      return {
        id: groupRef.id,
        ...newGroup
      };
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Please try again.');
      return null;
    }
  }, [currentUser]);
  
  // Update group
  const updateGroup = useCallback(async (groupId, groupData) => {
    if (!currentUser || !groupId) return false;
    
    try {
      // In development mode, simulate update
      if (process.env.NODE_ENV === 'development') {
        setGroups(prev => 
          prev.map(group => 
            group.id === groupId ? { ...group, ...groupData } : group
          )
        );
        
        if (currentGroup && currentGroup.id === groupId) {
          setCurrentGroup(prev => ({ ...prev, ...groupData }));
        }
        
        return true;
      }
      
      // In production, update in Firestore
      const groupRef = firestore.collection('groups').doc(groupId);
      await groupRef.update({
        ...groupData,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (err) {
      console.error('Error updating group:', err);
      setError('Failed to update group. Please try again.');
      return false;
    }
  }, [currentUser, currentGroup]);
  
  // Add member to group
  const addGroupMember = useCallback(async (groupId, memberData) => {
    if (!currentUser || !groupId) return false;
    
    try {
      // In development mode, simulate adding member
      if (process.env.NODE_ENV === 'development') {
        const newMember = {
          ...memberData,
          joinedAt: new Date().toISOString()
        };
        
        setGroups(prev => 
          prev.map(group => {
            if (group.id === groupId) {
              const updatedMembers = [...group.members, newMember];
              return { ...group, members: updatedMembers };
            }
            return group;
          })
        );
        
        setGroupMembers(prev => [...prev, newMember]);
        return true;
      }
      
      // In production, update in Firestore
      const groupRef = firestore.collection('groups').doc(groupId);
      await groupRef.update({
        members: firestore.FieldValue.arrayUnion({
          ...memberData,
          joinedAt: new Date().toISOString()
        })
      });
      
      return true;
    } catch (err) {
      console.error('Error adding group member:', err);
      setError('Failed to add member. Please try again.');
      return false;
    }
  }, [currentUser]);
  
  // Add contribution
  const addContribution = useCallback(async (groupId, contributionData) => {
    if (!currentUser || !groupId) return null;
    
    try {
      // In development mode, simulate adding contribution
      if (process.env.NODE_ENV === 'development') {
        const newContribution = {
          id: `contrib-${Date.now()}`,
          groupId,
          userId: currentUser.uid,
          ...contributionData,
          date: contributionData.date || new Date().toISOString()
        };
        
        setGroupContributions(prev => [...prev, newContribution]);
        return newContribution;
      }
      
      // In production, save to Firestore
      const contributionRef = firestore.collection('groups').doc(groupId).collection('contributions').doc();
      const newContribution = {
        groupId,
        userId: currentUser.uid,
        ...contributionData,
        date: contributionData.date || new Date().toISOString()
      };
      
      await contributionRef.set(newContribution);
      
      return {
        id: contributionRef.id,
        ...newContribution
      };
    } catch (err) {
      console.error('Error adding contribution:', err);
      setError('Failed to add contribution. Please try again.');
      return null;
    }
  }, [currentUser]);
  
  // Add investment
  const addInvestment = useCallback(async (groupId, investmentData) => {
    if (!currentUser || !groupId) return null;
    
    try {
      // In development mode, simulate adding investment
      if (process.env.NODE_ENV === 'development') {
        const newInvestment = {
          id: `invest-${Date.now()}`,
          groupId,
          ...investmentData,
          date: investmentData.date || new Date().toISOString(),
          status: investmentData.status || 'active',
          returns: investmentData.returns || 0,
          returnsPercentage: investmentData.returnsPercentage || 0
        };
        
        setGroupInvestments(prev => [...prev, newInvestment]);
        return newInvestment;
      }
      
      // In production, save to Firestore
      const investmentRef = firestore.collection('groups').doc(groupId).collection('investments').doc();
      const newInvestment = {
        groupId,
        ...investmentData,
        date: investmentData.date || new Date().toISOString(),
        status: investmentData.status || 'active',
        returns: investmentData.returns || 0,
        returnsPercentage: investmentData.returnsPercentage || 0
      };
      
      await investmentRef.set(newInvestment);
      
      return {
        id: investmentRef.id,
        ...newInvestment
      };
    } catch (err) {
      console.error('Error adding investment:', err);
      setError('Failed to add investment. Please try again.');
      return null;
    }
  }, [currentUser]);
  
  // Calculate group financial summary
  const calculateGroupSummary = useCallback((contributions, investments) => {
    const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
    const totalInvested = investments.reduce((sum, invest) => sum + invest.amount, 0);
    const totalReturns = investments.reduce((sum, invest) => sum + (invest.returns || 0), 0);
    const availableFunds = totalContributed - totalInvested;
    
    const activeInvestments = investments.filter(invest => invest.status === 'active');
    const totalActiveInvestments = activeInvestments.reduce((sum, invest) => sum + invest.amount, 0);
    
    const averageReturn = totalActiveInvestments > 0
      ? (totalReturns / totalActiveInvestments) * 100
      : 0;
    
    return {
      totalContributed,
      totalInvested,
      totalReturns,
      availableFunds,
      averageReturn,
      totalMembers: groupMembers.length,
      activeInvestments: activeInvestments.length
    };
  }, [groupMembers]);
  
  // Generate group financial report
  const generateGroupReport = useCallback(async (groupId, startDate, endDate) => {
    if (!groupId) return null;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Filter contributions and investments by date range
      const filteredContributions = groupContributions.filter(contrib => {
        const contribDate = new Date(contrib.date);
        return contribDate >= start && contribDate <= end;
      });
      
      const filteredInvestments = groupInvestments.filter(invest => {
        const investDate = new Date(invest.date);
        return investDate >= start && investDate <= end;
      });
      
      // Calculate member-specific contributions
      const contributionsByMember = {};
      filteredContributions.forEach(contrib => {
        if (!contributionsByMember[contrib.userId]) {
          contributionsByMember[contrib.userId] = 0;
        }
        contributionsByMember[contrib.userId] += contrib.amount;
      });
      
      // Convert to array format
      const memberContributions = Object.keys(contributionsByMember).map(userId => {
        const member = groupMembers.find(m => m.id === userId);
        return {
          userId,
          memberName: member ? member.name : 'Unknown Member',
          amount: contributionsByMember[userId]
        };
      });
      
      // Calculate investment returns by type
      const returnsByType = {};
      filteredInvestments.forEach(invest => {
        if (!returnsByType[invest.type]) {
          returnsByType[invest.type] = {
            amount: 0,
            returns: 0
          };
        }
        returnsByType[invest.type].amount += invest.amount;
        returnsByType[invest.type].returns += (invest.returns || 0);
      });
      
      // Convert to array format
      const investmentReturns = Object.keys(returnsByType).map(type => ({
        type,
        amount: returnsByType[type].amount,
        returns: returnsByType[type].returns,
        returnsPercentage: returnsByType[type].amount > 0
          ? (returnsByType[type].returns / returnsByType[type].amount) * 100
          : 0
      }));
      
      // Calculate summary values
      const totalContributions = filteredContributions.reduce((sum, contrib) => sum + contrib.amount, 0);
      const totalInvestmentAmount = filteredInvestments.reduce((sum, invest) => sum + invest.amount, 0);
      const totalReturns = filteredInvestments.reduce((sum, invest) => sum + (invest.returns || 0), 0);
      
      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        totalContributions,
        totalInvestmentAmount,
        totalReturns,
        returnOnInvestment: totalInvestmentAmount > 0
          ? (totalReturns / totalInvestmentAmount) * 100
          : 0,
        memberContributions,
        investmentReturns
      };
    } catch (err) {
      console.error('Error generating group report:', err);
      setError('Failed to generate report. Please try again.');
      return null;
    }
  }, [groupContributions, groupInvestments, groupMembers]);
  
  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  
  // Context value
  const value = {
    loading,
    error,
    groups,
    currentGroup,
    setCurrentGroup,
    groupContributions,
    groupInvestments,
    groupMembers,
    fetchGroups,
    loadGroupData,
    createGroup,
    updateGroup,
    addGroupMember,
    addContribution,
    addInvestment,
    calculateGroupSummary,
    generateGroupReport,
    INVESTMENT_TYPES,
    CONTRIBUTION_FREQUENCIES
  };
  
  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
};

// Custom hook to use the context
export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

export default GroupContext;
