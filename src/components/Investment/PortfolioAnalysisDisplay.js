import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  VStack,
  List,
  ListItem,
  ListIcon,
  useToast,
  useColorModeValue,
  Icon,
  Divider,
  Tag,
  Link as ChakraLink,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiRefreshCw, FiInfo, FiAlertTriangle, FiThumbsUp, FiBarChart2, FiUser, FiClock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const PortfolioAnalysisDisplay = () => {
  const { currentUser, getIdToken } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const headerBgColor = useColorModeValue('gray.50', 'gray.750'); // Slightly different for header

  const [analysisData, setAnalysisData] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const parseRemarks = (remarks) => {
    if (!remarks || typeof remarks !== 'string') return [];
    // Basic parsing for bullet points or numbered lists
    // Handles "- item", "* item", "1. item"
    return remarks.split(/\n(?=\s*[-*]|\s*\d+\.\s)/).map(line => line.trim()).filter(line => line);
  };


  const fetchAnalysis = useCallback(async () => {
    if (!currentUser || !getIdToken) {
      setAnalysisError("User not authenticated. Cannot fetch analysis.");
      return;
    }
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysisData(null); // Clear previous data

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Authentication token not available.");
      }
      const response = await axios.post('/api/ai/analyze-portfolio', {}, { // Empty object for POST body
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setAnalysisData(response.data); // Store the whole response: { analysis, profileUsed, timestamp }
        if (response.data.analysis) { // Check if analysis object itself is present
             toast({ title: 'Portfolio Analysis Updated', status: 'success', duration: 3000, isClosable: true });
        } else if (response.data.message) { // Handle messages like "No investments to analyze"
            toast({ title: 'Portfolio Analysis', description: response.data.message, status: 'info', duration: 5000, isClosable: true });
        }
      } else {
        throw new Error(response.data.error || 'Failed to get a successful analysis response.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch portfolio analysis.';
      setAnalysisError(errMsg);
      toast({ title: 'Analysis Error', description: errMsg, status: 'error', duration: 7000, isClosable: true });
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [currentUser, getIdToken, toast]);

  useEffect(() => {
    if (currentUser) { // Automatically fetch when component mounts and user is available
      fetchAnalysis();
    } else {
        setAnalysisData(null); // Clear data if user logs out
        setAnalysisError(null);
    }
  }, [currentUser, fetchAnalysis]); // fetchAnalysis is memoized


  const renderAnalysisSection = (title, data, icon, isList = false) => {
    if (!data) return null;
    const remarksArray = isList ? parseRemarks(data) : [data];

    return (
      <Box mb={6}>
        <Flex align="center" mb={2}>
          <Icon as={icon} mr={2} boxSize={5} color="primary.500" />
          <Heading size="md">{title}</Heading>
        </Flex>
        {isList && remarksArray.length > 0 ? (
          <List spacing={2} pl={2}>
            {remarksArray.map((item, index) => (
              <ListItem key={index} display="flex" alignItems="flex-start">
                <ListIcon as={FiInfo} color="primary.500" mt="0.2em" />
                <Text fontSize="sm">{item.replace(/^[-*]\s*|^\d+\.\s*/, '')}</Text> 
              </ListItem>
            ))}
          </List>
        ) : (
          <Text fontSize="sm" whiteSpace="pre-wrap">{remarksArray.join('\n')}</Text>
        )}
      </Box>
    );
  };

  return (
    <Box
      bg={cardBg}
      p={0} // Padding handled by inner content
      borderRadius="lg"
      shadow="xl"
      borderWidth="1px"
      borderColor={borderColor}
    >
      <Flex
        p={4}
        bg={headerBgColor}
        borderBottomWidth="1px"
        borderColor={borderColor}
        alignItems="center"
        justifyContent="space-between"
        borderTopRadius="lg" // Match overall border radius
      >
        <Heading size="md">
          <Icon as={FiBarChart2} mr={2} verticalAlign="middle" />
          AI Portfolio Insights
        </Heading>
        <Button
          size="sm"
          colorScheme="primary"
          variant="outline"
          leftIcon={<FiRefreshCw />}
          onClick={fetchAnalysis}
          isLoading={isLoadingAnalysis}
          loadingText="Refreshing"
        >
          Refresh Analysis
        </Button>
      </Flex>

      <Box p={5}>
        {isLoadingAnalysis && (
          <Flex justifyContent="center" alignItems="center" minHeight="200px">
            <Spinner size="lg" />
            <Text ml={3}>Analyzing your portfolio...</Text>
          </Flex>
        )}

        {!isLoadingAnalysis && analysisError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">Could not load AI Analysis.</Text>
              <Text fontSize="sm">{analysisError}</Text>
              {analysisError.toLowerCase().includes("ai profile not set up") && (
                 <NextLink href="/dashboard/ai-profile" passHref>
                    <ChakraLink color="blue.500" fontWeight="bold">
                        Go to AI Profile Setup
                    </ChakraLink>
                </NextLink>
              )}
            </VStack>
          </Alert>
        )}

        {!isLoadingAnalysis && !analysisError && !analysisData?.analysis && (
          <Text textAlign="center" py={10} color="gray.500">
            {analysisData?.message || "Click 'Refresh Analysis' to get AI-powered insights for your portfolio. Ensure your AI Profile is set up for best results."}
          </Text>
        )}

        {!isLoadingAnalysis && !analysisError && analysisData?.analysis && (
          <VStack spacing={6} align="stretch">
            {renderAnalysisSection(
              "Diversification Analysis",
              analysisData.analysis.diversification?.remarks,
              FiPieChart, // Example icon
              true // Remarks are expected to be bullet points
            )}
            <Divider />
            {renderAnalysisSection(
              "Risk Assessment",
              analysisData.analysis.risk?.assessment,
              FiAlertTriangle,
              true // Assessment might also be bullet points
            )}
            <Divider />
            {renderAnalysisSection(
              "Investment Recommendations",
              analysisData.analysis.recommendations?.[0]?.suggestionAndRationale, // Assuming V1 structure
              FiThumbsUp,
              true // Recommendations are expected as list
            )}
            <Divider />
            <Box fontSize="sm" color="gray.500" mt={4}>
              <Flex align="center" mb={1}>
                <Icon as={FiUser} mr={2} />
                <Text>
                  Analysis based on AI Profile (Risk: <Tag size="sm" colorScheme="blue">{analysisData.profileUsed?.riskTolerance || 'N/A'}</Tag>, 
                  Style: <Tag size="sm" colorScheme="purple">{(analysisData.profileUsed?.investmentStyle || []).join(', ') || 'N/A'}</Tag>)
                </Text>
              </Flex>
              <Flex align="center">
                <Icon as={FiClock} mr={2} />
                <Text>Last analyzed: {formatDate(analysisData.timestamp)}</Text>
              </Flex>
            </Box>
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default PortfolioAnalysisDisplay;
