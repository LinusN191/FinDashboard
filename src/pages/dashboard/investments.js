import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
  Link as ChakraLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  useColorModeValue,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  List,
  ListItem,
  ListIcon,
  Tag,
  Textarea,
  Tooltip, // Ensure Tooltip is imported
  IconButton, // Ensure IconButton is imported
} from '@chakra-ui/react';
import { FiPlus, FiRefreshCw, FiEdit, FiTrash2, FiLink, FiBriefcase, FiPlayCircle, FiTrendingUp, FiMessageSquare, FiInfo, FiUser, FiCpu, FiDollarSign } from 'react-icons/fi'; // Added more icons as needed
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useInvestment } from '../../context/InvestmentContext';
import { useAuth } from '../../context/AuthContext'; // Only if directly needed, context usually handles auth tokens

const InvestmentsDashboard = () => {
  const {
    investmentAssets, // Manually added assets
    loadingInvestmentAssets,
    assetOperationError,
    isPriceRefreshing,
    priceRefreshError,
    assetOperationLoading,
    addInvestmentAsset,
    refreshInvestmentPrices,
    deleteInvestmentAsset,
    updateInvestmentAsset,
    // New from context for exchange assets
    exchangeAssets,
    isLoadingExchangeAssets,
    exchangeAssetError,
    fetchAllExchangeAssets, // Function to manually trigger refresh of exchange assets
  } = useInvestment();

  const { isOpen: isAddModalOpen, onOpen: onAddModalOpen, onClose: onAddModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useDisclosure();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cancelRef = React.useRef();

  const initialNewAssetState = {
    assetType: 'STOCK', name: '', quantity: '', purchasePrice: '', purchaseDate: '', notes: '',
    apiId: '', tickerSymbol: '', issuer: '', maturityDate: '', couponRate: '', faceValue: '',
    propertyType: '', dividendYield: '', description: '', valuationMethod: '', valuationDate: '',
    underlyingAssetName: '', provider: '', percentageOwned: '', originalAssetValue: '',
  };

  const [newAsset, setNewAsset] = useState(initialNewAssetState);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [assetToDelete, setAssetToDelete] = useState(null);

  // --- Merge manual and exchange assets for display ---
  const [combinedAssets, setCombinedAssets] = useState([]);

  useEffect(() => {
    const manual = (investmentAssets || []).map(asset => ({ 
        ...asset, 
        source: 'Manual', 
        isReadOnly: false, 
        uniqueDisplayId: `manual-${asset.id}` 
    }));
    
    const exchange = (exchangeAssets || []).map(asset => ({
      ...asset,
      // API provides 'source', 'symbol', 'name', 'quantity', 'currentValue', 'lastPriceUpdate', 'sourceAssetId', 'sourceConnectionId'
      // Map to match table structure; purchasePrice is not available from balance APIs.
      purchasePrice: null, // Or a placeholder like 'N/A' or derived if transaction history was fetched
      isReadOnly: true,
      uniqueDisplayId: `exchange-${asset.sourceConnectionId}-${asset.sourceAssetId || asset.symbol}`,
    }));
    
    setCombinedAssets([...manual, ...exchange].sort((a, b) => a.name.localeCompare(b.name)));
  }, [investmentAssets, exchangeAssets]);


  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAsset = async () => {
    const { assetType, name, quantity, purchasePrice, purchaseDate, notes, ...typeSpecificFields } = newAsset;
    let missingBaseFields = !assetType || !name || !quantity || !purchasePrice || !purchaseDate;
    let missingTypeSpecificFields = false;
    switch (assetType) {
      case 'CRYPTO': missingTypeSpecificFields = !typeSpecificFields.apiId; break;
      case 'STOCK': case 'ETF': missingTypeSpecificFields = !typeSpecificFields.tickerSymbol; break;
      case 'REIT': missingTypeSpecificFields = !typeSpecificFields.propertyType || (!typeSpecificFields.tickerSymbol && typeSpecificFields.propertyType?.toLowerCase() !== 'private reit' && typeSpecificFields.propertyType?.toLowerCase() !== 'private'); break;
      case 'BOND': missingTypeSpecificFields = !typeSpecificFields.issuer || !typeSpecificFields.maturityDate || !typeSpecificFields.couponRate || !typeSpecificFields.faceValue; break;
      case 'ALTERNATIVE': missingTypeSpecificFields = !typeSpecificFields.description || !typeSpecificFields.valuationMethod; break;
      case 'FRACTIONAL': missingTypeSpecificFields = !typeSpecificFields.underlyingAssetName || !typeSpecificFields.provider || !typeSpecificFields.percentageOwned || !typeSpecificFields.originalAssetValue; break;
      default: break;
    }
    if (missingBaseFields || missingTypeSpecificFields) {
      toast({ title: "Missing Required Fields", description: "Please fill all required fields for the selected asset type.", status: "error", duration: 5000, isClosable: true });
      return;
    }
    const dataToSend = { assetType, name, quantity: parseFloat(quantity), purchasePrice: parseFloat(purchasePrice), purchaseDate, notes: notes || null, ...typeSpecificFields };
    if (dataToSend.couponRate) dataToSend.couponRate = parseFloat(dataToSend.couponRate);
    if (dataToSend.faceValue) dataToSend.faceValue = parseFloat(dataToSend.faceValue);
    if (dataToSend.dividendYield) dataToSend.dividendYield = parseFloat(dataToSend.dividendYield);
    if (dataToSend.percentageOwned) dataToSend.percentageOwned = parseFloat(dataToSend.percentageOwned);
    if (dataToSend.originalAssetValue) dataToSend.originalAssetValue = parseFloat(dataToSend.originalAssetValue);
    try {
      await addInvestmentAsset(dataToSend);
      onAddModalClose();
      setNewAsset(initialNewAssetState);
    } catch (error) { console.error("Failed to add asset from UI:", error); }
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    const purchaseDateFormatted = asset.purchaseDate ? (asset.purchaseDate.seconds ? new Date(asset.purchaseDate.seconds * 1000).toISOString().split('T')[0] : asset.purchaseDate.split('T')[0]) : '';
    const maturityDateFormatted = asset.maturityDate ? (asset.maturityDate.seconds ? new Date(asset.maturityDate.seconds * 1000).toISOString().split('T')[0] : asset.maturityDate.split('T')[0]) : '';
    const valuationDateFormatted = asset.valuationDate ? (asset.valuationDate.seconds ? new Date(asset.valuationDate.seconds * 1000).toISOString().split('T')[0] : asset.valuationDate.split('T')[0]) : '';
    setEditFormData({
      ...initialNewAssetState, ...asset, purchaseDate: purchaseDateFormatted, maturityDate: maturityDateFormatted, valuationDate: valuationDateFormatted,
      quantity: asset.quantity?.toString() || '', purchasePrice: asset.purchasePrice?.toString() || '', couponRate: asset.couponRate?.toString() || '',
      faceValue: asset.faceValue?.toString() || '', dividendYield: asset.dividendYield?.toString() || '', percentageOwned: asset.percentageOwned?.toString() || '',
      originalAssetValue: asset.originalAssetValue?.toString() || '', apiId: asset.apiId || (asset.assetType === 'CRYPTO' ? asset.cryptoSymbol : '') || '',
      tickerSymbol: asset.tickerSymbol || '', issuer: asset.issuer || '', propertyType: asset.propertyType || '', description: asset.description || '',
      valuationMethod: asset.valuationMethod || '', underlyingAssetName: asset.underlyingAssetName || '', provider: asset.provider || '', notes: asset.notes || '',
    });
    onEditModalOpen();
  };
  
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset) return;
    const { assetType, name, quantity, purchasePrice, purchaseDate, notes, ...typeSpecificFields } = editFormData;
    let missingBaseFieldsEdit = !name || !quantity || !purchasePrice || !purchaseDate;
    let missingTypeSpecificFieldsEdit = false;
    switch (assetType) {
        case 'CRYPTO': missingTypeSpecificFieldsEdit = !typeSpecificFields.apiId; break;
        case 'STOCK': case 'ETF': missingTypeSpecificFieldsEdit = !typeSpecificFields.tickerSymbol; break;
        case 'REIT': missingTypeSpecificFieldsEdit = !typeSpecificFields.propertyType || (!typeSpecificFields.tickerSymbol && typeSpecificFields.propertyType?.toLowerCase() !== 'private reit' && typeSpecificFields.propertyType?.toLowerCase() !== 'private'); break;
        case 'BOND': missingTypeSpecificFieldsEdit = !typeSpecificFields.issuer || !typeSpecificFields.maturityDate || !typeSpecificFields.couponRate || !typeSpecificFields.faceValue; break;
        case 'ALTERNATIVE': missingTypeSpecificFieldsEdit = !typeSpecificFields.description || !typeSpecificFields.valuationMethod; break;
        case 'FRACTIONAL': missingTypeSpecificFieldsEdit = !typeSpecificFields.underlyingAssetName || !typeSpecificFields.provider || !typeSpecificFields.percentageOwned || !typeSpecificFields.originalAssetValue; break;
        default: break;
    }
    if (missingBaseFieldsEdit || missingTypeSpecificFieldsEdit) {
        toast({ title: "Missing Required Fields for Edit", description: "Please ensure all required fields are filled.", status: "error", duration: 5000, isClosable: true });
        return;
    }
    const updates = { name, quantity: parseFloat(quantity), purchasePrice: parseFloat(purchasePrice), purchaseDate, notes: notes || null, ...typeSpecificFields };
    if (updates.couponRate) updates.couponRate = parseFloat(updates.couponRate);
    if (updates.faceValue) updates.faceValue = parseFloat(updates.faceValue);
    if (updates.dividendYield) updates.dividendYield = parseFloat(updates.dividendYield);
    if (updates.percentageOwned) updates.percentageOwned = parseFloat(updates.percentageOwned);
    if (updates.originalAssetValue) updates.originalAssetValue = parseFloat(updates.originalAssetValue);
    try {
      await updateInvestmentAsset(editingAsset.id, updates); // editingAsset.id is only for manual assets
      onEditModalClose();
      setEditingAsset(null);
    } catch (error) { console.error("Failed to update asset from UI:", error); }
  };

  const openDeleteAlert = (asset) => { setAssetToDelete(asset); onDeleteAlertOpen(); };
  const handleConfirmDelete = async () => {
    if (assetToDelete) {
      try { await deleteInvestmentAsset(assetToDelete.id); } // assetToDelete.id is only for manual assets
      catch (error) { console.error("Failed to delete asset from UI:", error); } 
      finally { onDeleteAlertClose(); setAssetToDelete(null); }
    }
  };

  const formatCurrency = (value) => { /* ... */ };
  const formatNumber = (value) => { /* ... */ };
  const calculateTotalPurchaseValue = (asset) => { /* ... */ };
  const formatReturnPercentage = (asset) => { /* ... */ };
  
  // Re-define formatters here for brevity, assume they are correct from previous steps
  const _formatCurrency = (val) => (val == null || isNaN(parseFloat(val))) ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));
  const _formatNumber = (val, digits = 2) => (val == null || isNaN(parseFloat(val))) ? 'N/A' : parseFloat(val).toLocaleString(undefined, {minimumFractionDigits: digits, maximumFractionDigits:digits});
  const _calculateTotalPurchaseValue = (asset) => (asset.purchasePrice == null || asset.quantity == null) ? NaN : parseFloat(asset.purchasePrice) * parseFloat(asset.quantity);
  const _formatReturnPercentage = (asset) => {
    if (asset.purchasePrice == null || asset.currentValue == null) return 'N/A';
    const purchaseValue = _calculateTotalPurchaseValue(asset);
    if (isNaN(purchaseValue) || purchaseValue === 0) return 'N/A';
    const returnPercent = ((parseFloat(asset.currentValue) - purchaseValue) / purchaseValue) * 100;
    return `${returnPercent.toFixed(2)}%`;
  };


  const AssetFormFields = ({ formData, handleInputChange, assetTypeReadOnly = false }) => { /* ... */ };

  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading as="h1" size="xl">My Investments</Heading>
          <HStack> {/* Use HStack for button group */}
            <Button
              leftIcon={<FiLink />}
              colorScheme="teal"
              variant="outline"
              onClick={fetchAllExchangeAssets} // Manually trigger refresh of exchange assets
              isLoading={isLoadingExchangeAssets}
              isDisabled={isPriceRefreshing || assetOperationLoading}
            >
              Sync Exchanges
            </Button>
            <Button
              leftIcon={<FiRefreshCw />}
              colorScheme="blue"
              onClick={async () => { try { await refreshInvestmentPrices(); } catch (e) { /* Context handles toast */ } }}
              isLoading={isPriceRefreshing}
              isDisabled={isLoadingExchangeAssets || assetOperationLoading}
              mr={3}
            >
              Refresh Prices (Manual)
            </Button>
            <Button leftIcon={<FiPlus />} colorScheme="primary" onClick={onAddModalOpen} isDisabled={isLoadingExchangeAssets || isPriceRefreshing || assetOperationLoading}>
              Add Manual Asset
            </Button>
          </HStack>
        </Flex>

        { (assetOperationError || exchangeAssetError) && combinedAssets.length === 0 && (
            <Alert status="error" mb={6} borderRadius="md">
                <AlertIcon />
                <VStack align="start">
                    {assetOperationError && <Text>Error with manual assets: {typeof assetOperationError === 'string' ? assetOperationError : assetOperationError.message}</Text>}
                    {exchangeAssetError && <Text>Error with exchange assets: {typeof exchangeAssetError === 'string' ? exchangeAssetError : JSON.stringify(exchangeAssetError)}</Text>}
                </VStack>
            </Alert>
        )}
        
        {(loadingInvestmentAssets || isLoadingExchangeAssets) && combinedAssets.length === 0 && (
            <Flex justifyContent="center" my={10}><Spinner size="xl" /> <Text ml={3}>Loading investments...</Text></Flex>
        )}

        {!loadingInvestmentAssets && !isLoadingExchangeAssets && !assetOperationError && !exchangeAssetError && combinedAssets.length === 0 && (
          <Text textAlign="center" py={10} fontSize="lg" color="gray.500">
            No investments found. Add assets manually or connect an exchange via the "Sync Exchanges" button or <NextLink href="/dashboard/connections" passHref><ChakraLink color="primary.500">Connections page</ChakraLink></NextLink>.
          </Text>
        )}

        {combinedAssets.length > 0 && (
          <Box overflowX="auto" bg={cardBg} p={4} borderRadius="lg" shadow="base" borderWidth="1px" borderColor={borderColor}>
            <Table variant="simple" size="md">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Source</Th> {/* New Column */}
                  <Th isNumeric>Quantity</Th>
                  <Th isNumeric>Purchase Price</Th>
                  <Th isNumeric>Total Purchase Value</Th>
                  <Th isNumeric>Current Value</Th>
                  <Th isNumeric>Return (%)</Th>
                  <Th>Last Updated</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {combinedAssets.map((asset) => {
                  const totalPurchaseValue = asset.purchasePrice != null ? _calculateTotalPurchaseValue(asset) : NaN;
                  const returnPercentageStr = asset.purchasePrice != null ? _formatReturnPercentage(asset) : 'N/A';
                  const isPositiveReturn = returnPercentageStr !== 'N/A' && parseFloat(returnPercentageStr) >= 0;
                  
                  return (
                    <Tr key={asset.uniqueDisplayId}>
                      <Td fontWeight="medium">{asset.name || asset.symbol}</Td>
                      <Td>{asset.assetType}</Td>
                      <Td>
                        <Tag size="sm" colorScheme={asset.source === 'Manual' ? 'blue' : 'green'} variant="subtle" textTransform="capitalize">
                            {asset.source}
                        </Tag>
                      </Td>
                      <Td isNumeric>{_formatNumber(asset.quantity, asset.assetType === 'CRYPTO' ? 8 : 2)}</Td>
                      <Td isNumeric>{asset.purchasePrice != null ? _formatCurrency(asset.purchasePrice) : 'N/A'}</Td>
                      <Td isNumeric>{isNaN(totalPurchaseValue) ? 'N/A' : _formatCurrency(totalPurchaseValue)}</Td>
                      <Td isNumeric fontWeight="bold">{_formatCurrency(asset.currentValue)}</Td>
                      <Td isNumeric color={returnPercentageStr === 'N/A' ? 'gray.500' : isPositiveReturn ? 'green.500' : 'red.500'}>
                        {returnPercentageStr}
                      </Td>
                      <Td>{asset.lastPriceUpdate ? new Date(asset.lastPriceUpdate).toLocaleDateString() : (asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() + ' (Created)' : 'N/A')}</Td>
                      <Td>
                        <Tooltip label={asset.isReadOnly ? "Cannot edit exchange-synced asset" : "Edit Asset"} hasArrow>
                          <IconButton 
                            icon={<FiEdit />} 
                            variant="ghost" 
                            aria-label="Edit asset" 
                            mr={2} 
                            onClick={() => !asset.isReadOnly && openEditModal(asset)}
                            isDisabled={asset.isReadOnly || assetOperationLoading || isPriceRefreshing || isLoadingExchangeAssets}
                          />
                        </Tooltip>
                        <Tooltip label={asset.isReadOnly ? "Cannot delete exchange-synced asset" : "Delete Asset"} hasArrow>
                          <IconButton 
                            icon={<FiTrash2 />} 
                            variant="ghost" 
                            colorScheme="red" 
                            aria-label="Delete asset" 
                            onClick={() => !asset.isReadOnly && openDeleteAlert(asset)}
                            isDisabled={asset.isReadOnly || assetOperationLoading || isPriceRefreshing || isLoadingExchangeAssets}
                          />
                        </Tooltip>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Add New Asset Modal (uses AssetFormFields) */}
        <Modal isOpen={isAddModalOpen} onClose={onAddModalClose} size="lg" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Add New Manual Investment</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}><AssetFormFields formData={newAsset} handleInputChange={handleAddInputChange} /></ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onAddModalClose}>Cancel</Button>
                    <Button colorScheme="primary" onClick={handleAddAsset} isLoading={assetOperationLoading} /* isDisabled logic from previous step */ >Save Asset</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>

        {/* Edit Asset Modal (uses AssetFormFields) */}
        {editingAsset && (
            <Modal isOpen={isEditModalOpen} onClose={() => { onEditModalClose(); setEditingAsset(null); }} size="lg" isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Manual Investment: {editingAsset.name}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}><AssetFormFields formData={editFormData} handleInputChange={handleEditInputChange} assetTypeReadOnly={true} /></ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={() => { onEditModalClose(); setEditingAsset(null); }}>Cancel</Button>
                        <Button colorScheme="primary" onClick={handleUpdateAsset} isLoading={assetOperationLoading} /* isDisabled logic from previous step */ >Save Changes</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        )}
        
        {/* Delete Asset Confirmation Dialog */}
        {assetToDelete && (
          <AlertDialog isOpen={isDeleteAlertOpen} leastDestructiveRef={cancelRef} onClose={() => { onDeleteAlertClose(); setAssetToDelete(null); }} isCentered>
            <AlertDialogOverlay><AlertDialogContent>
                <AlertDialogHeader>Delete Investment: {assetToDelete.name}</AlertDialogHeader>
                <AlertDialogBody>Are you sure you want to delete "{assetToDelete.name}"? This action cannot be undone.</AlertDialogBody>
                <AlertDialogFooter>
                    <Button ref={cancelRef} onClick={() => { onDeleteAlertClose(); setAssetToDelete(null); }} isDisabled={assetOperationLoading}>Cancel</Button>
                    <Button colorScheme="red" onClick={handleConfirmDelete} ml={3} isLoading={assetOperationLoading}>Delete</Button>
                </AlertDialogFooter>
            </AlertDialogContent></AlertDialogOverlay>
          </AlertDialog>
        )}
      </Box>
    </DashboardLayout>
  );
};

// Re-define AssetFormFields here for completeness in this overwrite, assuming it was defined correctly in previous steps
const AssetFormFields = ({ formData, handleInputChange, assetTypeReadOnly = false }) => {
  const currentAssetType = formData.assetType;
  return (
    <VStack spacing={4}>
      <FormControl isRequired>
        <FormLabel>Asset Type</FormLabel>
        <Select name="assetType" value={currentAssetType} onChange={handleInputChange} isDisabled={assetTypeReadOnly}>
          <option value="STOCK">Stock</option>
          <option value="ETF">ETF</option>
          <option value="CRYPTO">Cryptocurrency</option>
          <option value="BOND">Bond</option>
          <option value="REIT">REIT</option>
          <option value="ALTERNATIVE">Alternative Investment</option>
          <option value="FRACTIONAL">Fractional Ownership</option>
        </Select>
      </FormControl>
      <FormControl isRequired><FormLabel>Asset Name</FormLabel><Input type="text" name="name" placeholder="e.g., Apple Shares" value={formData.name} onChange={handleInputChange} /></FormControl>
      {currentAssetType === 'CRYPTO' && (<FormControl isRequired><FormLabel>CoinGecko ID</FormLabel><Input type="text" name="apiId" placeholder="e.g., bitcoin" value={formData.apiId} onChange={handleInputChange} /><Text fontSize="xs" color="gray.500" mt={1}>For price updates.</Text></FormControl>)}
      {(currentAssetType === 'STOCK' || currentAssetType === 'ETF' || currentAssetType === 'REIT') && (<FormControl isRequired={currentAssetType !== 'REIT' || (currentAssetType === 'REIT' && formData.propertyType?.toLowerCase() !== 'private reit' && formData.propertyType?.toLowerCase() !== 'private')}><FormLabel>Ticker Symbol</FormLabel><Input type="text" name="tickerSymbol" placeholder="e.g., AAPL, O" value={formData.tickerSymbol} onChange={handleInputChange} /><Text fontSize="xs" color="gray.500" mt={1}>For price updates (if public).</Text></FormControl>)}
      {currentAssetType === 'BOND' && (<><FormControl isRequired><FormLabel>Issuer</FormLabel><Input type="text" name="issuer" value={formData.issuer} onChange={handleInputChange} /></FormControl><FormControl isRequired><FormLabel>Maturity Date</FormLabel><Input type="date" name="maturityDate" value={formData.maturityDate} onChange={handleInputChange} /></FormControl><FormControl isRequired><FormLabel>Coupon Rate (%)</FormLabel><Input type="number" name="couponRate" value={formData.couponRate} onChange={handleInputChange} step="0.01" /></FormControl><FormControl isRequired><FormLabel>Face Value</FormLabel><Input type="number" name="faceValue" value={formData.faceValue} onChange={handleInputChange} /></FormControl></>)}
      {currentAssetType === 'REIT' && (<><FormControl isRequired><FormLabel>Property Type</FormLabel><Input type="text" name="propertyType" value={formData.propertyType} onChange={handleInputChange} placeholder="e.g., Commercial, Residential, Private REIT" /></FormControl><FormControl><FormLabel>Dividend Yield (%)</FormLabel><Input type="number" name="dividendYield" value={formData.dividendYield} onChange={handleInputChange} step="0.01" /></FormControl></>)}
      {currentAssetType === 'ALTERNATIVE' && (<><FormControl isRequired><FormLabel>Description</FormLabel><Textarea name="description" value={formData.description} onChange={handleInputChange} /></FormControl><FormControl isRequired><FormLabel>Valuation Method</FormLabel><Input type="text" name="valuationMethod" value={formData.valuationMethod} onChange={handleInputChange} /></FormControl><FormControl><FormLabel>Valuation Date</FormLabel><Input type="date" name="valuationDate" value={formData.valuationDate} onChange={handleInputChange} /></FormControl></>)}
      {currentAssetType === 'FRACTIONAL' && (<><FormControl isRequired><FormLabel>Underlying Asset</FormLabel><Input type="text" name="underlyingAssetName" value={formData.underlyingAssetName} onChange={handleInputChange} /></FormControl><FormControl isRequired><FormLabel>Provider</FormLabel><Input type="text" name="provider" value={formData.provider} onChange={handleInputChange} /></FormControl><FormControl isRequired><FormLabel>% Owned</FormLabel><Input type="number" name="percentageOwned" value={formData.percentageOwned} onChange={handleInputChange} step="0.01" min="0.01" max="100" /></FormControl><FormControl isRequired><FormLabel>Original Asset Value</FormLabel><Input type="number" name="originalAssetValue" value={formData.originalAssetValue} onChange={handleInputChange} /></FormControl></>)}
      <FormControl isRequired><FormLabel>Quantity</FormLabel><Input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} /></FormControl>
      <FormControl isRequired><FormLabel>Purchase Price (per unit)</FormLabel><Input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleInputChange} /></FormControl>
      <FormControl isRequired><FormLabel>Purchase Date</FormLabel><Input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]}/></FormControl>
      <FormControl><FormLabel>Notes</FormLabel><Input type="text" name="notes" value={formData.notes} onChange={handleInputChange} /></FormControl>
    </VStack>
  );
};


export default InvestmentsDashboard;
