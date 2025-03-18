import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Stack,
  Badge,
  Divider,
  Icon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiTarget, FiAlertCircle, FiBarChart2, FiPieChart } from 'react-icons/fi';
import { useInvestment } from '../context/InvestmentContext';
import { useFinance } from '../context/FinanceContext';

// Insight card component
const InsightCard = ({ title, description, type, icon, actionText, onAction }) => {
  // Colors based on insight type
  const getTypeColor = (type) => {
    switch (type) {
      case 'opportunity':
        return 'green';
      case 'warning':
        return 'red';
      case 'neutral':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const typeColor = getTypeColor(type);

  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={bgColor}
      boxShadow="sm"
      transition="transform 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
      <Flex justify="space-between" align="flex-start" mb={2}>
        <Badge colorScheme={typeColor} px={2} py={1} borderRadius="full">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
        <Icon as={icon} boxSize={5} color={`${typeColor}.500`} />
      </Flex>
      
      <Heading size="sm" mb={2}>{title}</Heading>
      <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')} mb={4}>
        {description}
      </Text>
      
      {actionText && onAction && (
        <Button 
          size="sm" 
          colorScheme={typeColor} 
          variant="outline"
          onClick={onAction}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
};

const AIInsightsPanel = () => {
  const { assetData, performanceMetrics } = useInvestment();
  const { budgets, expenses, debts, savingsGoals } = useFinance();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Function to generate and load insights
  const loadInsights = () => {
    // Set loading state
    setLoading(true);
    
    // This would typically come from an API that processes the user's data
    // For now, we'll generate some sample insights
    const sampleInsights = [
      {
        id: 1,
        category: 'investment',
        title: 'Diversification Opportunity',
        description: 'Your portfolio is heavily weighted in technology stocks (65%). Consider diversifying to reduce sector risk.',
        type: 'opportunity',
        icon: FiPieChart,
        actionText: 'View Recommendations'
      },
      {
        id: 2,
        category: 'investment',
        title: 'Market Volatility Alert',
        description: 'Recent market volatility suggests defensive positioning. Consider increasing cash reserves or adding stable dividend stocks.',
        type: 'warning',
        icon: FiBarChart2,
        actionText: 'See Strategy'
      },
      {
        id: 3,
        category: 'budget',
        title: 'Entertainment Budget Alert',
        description: 'Your entertainment spending is 35% above budget this month. Consider reducing discretionary spending.',
        type: 'warning',
        icon: FiAlertCircle,
        actionText: 'View Budget'
      },
      {
        id: 4,
        category: 'savings',
        title: 'Savings Opportunity',
        description: 'Based on your income and expenses, you could increase your monthly savings by approximately $250.',
        type: 'opportunity',
        icon: FiDollarSign,
        actionText: 'Optimize Savings'
      },
      {
        id: 5,
        category: 'debt',
        title: 'Debt Reduction Strategy',
        description: 'Paying an extra $100 monthly on your highest-interest debt could save you $1,250 in interest over the loan term.',
        type: 'opportunity',
        icon: FiTrendingDown,
        actionText: 'Apply Strategy'
      },
      {
        id: 6,
        category: 'investment',
        title: 'Retirement Contribution',
        description: "You're not maximizing your retirement contributions. Increasing your 401(k) contributions could save approximately $850 in taxes this year.",
        type: 'neutral',
        icon: FiTarget,
        actionText: 'Calculate Benefits'
      }
    ];
    
    // Simulate API delay
    setTimeout(() => {
      setInsights(sampleInsights);
      setLoading(false);
    }, 800);
  };
  
  // Function to handle refresh
  const handleRefresh = () => {
    loadInsights();
  };
  
  // Load insights on initial render
  useEffect(() => {
    loadInsights();
  }, [assetData, performanceMetrics, budgets, expenses, debts, savingsGoals]);
  
  // Handle insight action
  const handleInsightAction = (insightId) => {
    console.log(`Action taken on insight: ${insightId}`);
    // In a real app, this would navigate to a specific page or open a modal with details
  };
  
  // Get insights by category
  const getInsightsByCategory = (category) => {
    return insights.filter(insight => insight.category === category);
  };
  
  // Background colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const headerBgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
    >
      <Flex 
        p={4} 
        bg={headerBgColor}
        borderBottomWidth="1px"
        borderColor={borderColor}
        align="center"
        justify="space-between"
      >
        <Box>
          <Heading size="md">AI Financial Insights</Heading>
          <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
            Personalized recommendations based on your data
          </Text>
        </Box>
        
        <Button 
          size="sm" 
          colorScheme="primary" 
          variant="outline"
          onClick={handleRefresh}
          isLoading={loading}
          loadingText="Refreshing"
        >
          Refresh Insights
        </Button>
      </Flex>
      
      <Box p={4}>
        {loading ? (
          <Text textAlign="center" py={4}>Loading personalized insights...</Text>
        ) : (
          <Stack spacing={4}>
            <Accordion allowMultiple defaultIndex={[0]}>
              {/* Investment Insights */}
              <AccordionItem border="none">
                <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                  <Box flex="1" textAlign="left">
                    <Heading size="sm">Investment Insights</Heading>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} px={0}>
                  <Stack spacing={3}>
                    {getInsightsByCategory('investment').map(insight => (
                      <InsightCard
                        key={insight.id}
                        title={insight.title}
                        description={insight.description}
                        type={insight.type}
                        icon={insight.icon}
                        actionText={insight.actionText}
                        onAction={() => handleInsightAction(insight.id)}
                      />
                    ))}
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
              
              {/* Budget & Spending Insights */}
              <AccordionItem border="none">
                <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                  <Box flex="1" textAlign="left">
                    <Heading size="sm">Budget & Spending</Heading>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} px={0}>
                  <Stack spacing={3}>
                    {getInsightsByCategory('budget').map(insight => (
                      <InsightCard
                        key={insight.id}
                        title={insight.title}
                        description={insight.description}
                        type={insight.type}
                        icon={insight.icon}
                        actionText={insight.actionText}
                        onAction={() => handleInsightAction(insight.id)}
                      />
                    ))}
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
              
              {/* Savings & Debt Insights */}
              <AccordionItem border="none">
                <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                  <Box flex="1" textAlign="left">
                    <Heading size="sm">Savings & Debt</Heading>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} px={0}>
                  <Stack spacing={3}>
                    {[...getInsightsByCategory('savings'), ...getInsightsByCategory('debt')].map(insight => (
                      <InsightCard
                        key={insight.id}
                        title={insight.title}
                        description={insight.description}
                        type={insight.type}
                        icon={insight.icon}
                        actionText={insight.actionText}
                        onAction={() => handleInsightAction(insight.id)}
                      />
                    ))}
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            
            <Divider />
            
            <Box textAlign="center">
              <Button 
                size="sm" 
                colorScheme="primary" 
                variant="ghost"
                rightIcon={<FiBarChart2 />}
              >
                View All Insights
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AIInsightsPanel;
