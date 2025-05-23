import React, { useState, useEffect, useCallback } from 'react';
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
  VStack,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tag,
  SkeletonText,
  Divider,
  Select, // Added for crypto currency selection
  IconButton, // For copy button
  InputGroup, // For copy button
  InputRightElement, // For copy button
} from '@chakra-ui/react';
import { 
    FiDollarSign, FiTrendingUp, FiTrendingDown, FiRotateCw, FiCreditCard, 
    FiCopy, FiCheckCircle, FiLogIn, FiLogOut // Added icons
} from 'react-icons/fi';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useWallet } from '../../context/WalletContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { QRCode } from 'react-qrcode-logo'; // Using react-qrcode-logo for QR code
import { ethers } from 'ethers'; // For address validation and unit conversion

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const SUPPORTED_CRYPTO_CURRENCIES = [
    { value: 'USDC_POLYGON', label: 'USDC (Polygon)', decimals: 6, symbol: 'USDC' },
    { value: 'USDT_POLYGON', label: 'USDT (Polygon)', decimals: 6, symbol: 'USDT' },
];

// StripeDepositForm Component (from previous step, assumed to be correct)
const StripeDepositForm = () => {
  const stripeHook = useStripe(); // Renamed to avoid conflict
  const elementsHook = useElements(); // Renamed
  const { initiateStripeDeposit, isSubmittingWalletAction: isCreatingIntent, fetchWalletBalance, fetchTransactions } = useWallet();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [depositAmountStripe, setDepositAmountStripe] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleStripeDepositSubmit = async (event) => {
    event.preventDefault();
    if (!stripeHook || !elementsHook) { /* ... */ return; }
    if (!cardComplete) { setStripeError("Please complete your card details."); return; }
    setIsConfirmingPayment(true); setStripeError(null);
    const initiateResponse = await initiateStripeDeposit(depositAmountStripe);
    if (!initiateResponse.success || !initiateResponse.clientSecret) {
      setStripeError(initiateResponse.error || 'Failed to initialize payment.');
      setIsConfirmingPayment(false); return;
    }
    const cardElement = elementsHook.getElement(CardElement);
    if (!cardElement) { /* ... */ setIsConfirmingPayment(false); return; }
    const { error, paymentIntent } = await stripeHook.confirmCardPayment(initiateResponse.clientSecret, {
      payment_method: { card: cardElement },
    });
    if (error) {
      setStripeError(error.message || 'Payment confirmation failed.');
      toast({ title: 'Payment Error', description: error.message, status: 'error' });
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast({ title: 'Payment Successful!', description: `Deposit of $${depositAmountStripe} initiated.`, status: 'success' });
      setDepositAmountStripe(''); cardElement.clear(); setCardComplete(false);
      setTimeout(() => { fetchWalletBalance(); fetchTransactions(10, false); }, 2000);
    } else if (paymentIntent) {
      setStripeError(`Payment status: ${paymentIntent.status}.`);
      toast({ title: 'Payment Status', description: `Status: ${paymentIntent.status}`, status: 'warning' });
    }
    setIsConfirmingPayment(false);
  };
  const cardElementOptions = { /* ... */ };
  const isProcessingPayment = isCreatingIntent || isConfirmingPayment;
  return (
    <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor}>
      <Heading as="h3" size="md" mb={4}>Deposit with Card (Stripe)</Heading>
      <form onSubmit={handleStripeDepositSubmit}>
        <VStack spacing={4}>
          <FormControl id="depositAmountStripe" isRequired>
            <FormLabel>Amount to Deposit (USD)</FormLabel>
            <Input type="number" value={depositAmountStripe} onChange={(e) => { setDepositAmountStripe(e.target.value); setStripeError(null); }} placeholder="e.g., 50.00" min="0.50" step="0.01" isDisabled={isProcessingPayment} />
          </FormControl>
          <FormControl id="card-element" isRequired>
            <FormLabel>Card Details</FormLabel>
            <Box p={3} borderWidth="1px" borderRadius="md" borderColor={borderColor}><CardElement options={cardElementOptions} onChange={(e) => { setStripeError(e.error ? e.error.message : null); setCardComplete(e.complete); }}/></Box>
          </FormControl>
          {stripeError && <Alert status="error" size="sm" borderRadius="md"><AlertIcon />{stripeError}</Alert>}
          <Button type="submit" colorScheme="purple" leftIcon={<FiCreditCard />} isLoading={isProcessingPayment} isDisabled={!stripeHook || !elementsHook || !cardComplete || isProcessingPayment || !depositAmountStripe || parseFloat(depositAmountStripe) < 0.50} isFullWidth> Deposit ${depositAmountStripe || '0.00'} </Button>
        </VStack>
      </form>
    </Box>
  );
};


// Main WalletPage Component
const WalletPage = () => {
  const {
    walletBalance, // fiat balance { amount, currency }
    cryptoBalancesData, // { USDC_POLYGON: '123.45', ... } (amounts as human-readable strings)
    transactions,
    loadingBalance, // Covers both fiat and crypto
    // loadingCryptoBalances, // Not separate, uses loadingBalance
    loadingTransactions,
    walletError, // Shared error state for now
    // cryptoBalancesError, // Not separate
    transactionPagination,
    isSubmittingWalletAction, // For all wallet submit actions
    isFetchingDepositAddress, // Specific for crypto deposit address fetching
    // depositFunds, // Old direct fiat deposit, replaced by Stripe for UI
    withdrawFunds, // Fiat withdrawal
    fetchWalletBalance, // Refreshes both fiat and crypto
    fetchTransactions,
    initiateStripeDeposit, // Already used by StripeDepositForm internal component
    fetchCryptoDepositAddress,
    initiateCryptoWithdrawal,
  } = useWallet();

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fiat withdrawal state
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  // Crypto Deposit State
  const [selectedCryptoForDeposit, setSelectedCryptoForDeposit] = useState(SUPPORTED_CRYPTO_CURRENCIES[0].value);
  const [depositAddressInfo, setDepositAddressInfo] = useState(null); // { address, currency }
  const [hasCopied, setHasCopied] = useState(false);

  // Crypto Withdrawal State
  const [selectedCryptoForWithdrawal, setSelectedCryptoForWithdrawal] = useState(SUPPORTED_CRYPTO_CURRENCIES[0].value);
  const [withdrawalToAddress, setWithdrawalToAddress] = useState('');
  const [withdrawalAmountCrypto, setWithdrawalAmountCrypto] = useState('');


  const formatCurrency = (amountInCents, currencyCode = 'USD') => {
    if (amountInCents == null || isNaN(parseFloat(amountInCents))) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(parseFloat(amountInCents) / 100);
  };

  const formatCryptoAmount = (amountStr, currencyValue) => {
    if (amountStr == null || isNaN(parseFloat(amountStr))) return 'N/A';
    const token = SUPPORTED_CRYPTO_CURRENCIES.find(c => c.value === currencyValue);
    return `${parseFloat(amountStr).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: token?.decimals || 6 })} ${token?.symbol || ''}`;
  };

  const handleFiatWithdraw = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a positive amount to withdraw.', status: 'error' });
      return;
    }
    const amountInCents = Math.round(amount * 100);
    try {
      await withdrawFunds(amountInCents, 'USD'); // Context handles toast
      setWithdrawalAmount('');
    } catch (err) { console.error("Fiat withdrawal failed from UI:", err); }
  };
  
  const handleShowDepositAddress = async () => {
    setDepositAddressInfo(null); // Clear previous
    setHasCopied(false);
    const result = await fetchCryptoDepositAddress(selectedCryptoForDeposit);
    if (result.success) {
      setDepositAddressInfo(result);
    } // Error toast is handled by context
  };

  const handleCryptoWithdraw = async () => {
    if (!ethers.utils.isAddress(withdrawalToAddress)) {
      toast({ title: 'Invalid Address', description: 'Please enter a valid recipient address.', status: 'error' });
      return;
    }
    const amount = parseFloat(withdrawalAmountCrypto);
    const tokenInfo = SUPPORTED_CRYPTO_CURRENCIES.find(c => c.value === selectedCryptoForWithdrawal);
    if (!tokenInfo || isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a positive amount.', status: 'error' });
      return;
    }
    // Check balance
    const currentBalanceStr = cryptoBalancesData?.[selectedCryptoForWithdrawal] || '0';
    if (amount > parseFloat(currentBalanceStr)) {
        toast({ title: 'Insufficient Balance', description: `You do not have enough ${tokenInfo.symbol}.`, status: 'error' });
        return;
    }
    try {
      const amountInSmallestUnit = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
      await initiateCryptoWithdrawal(amountInSmallestUnit.toString(), selectedCryptoForWithdrawal, withdrawalToAddress);
      setWithdrawalAmountCrypto('');
      setWithdrawalToAddress('');
      // Success toast handled by context
    } catch (err) { console.error("Crypto withdrawal failed from UI:", err); /* Error toast handled by context */ }
  };


  const getTransactionTypeTagColor = (type) => {
    const colors = { DEPOSIT: 'green', WITHDRAWAL: 'red', TRANSFER_IN: 'blue', TRANSFER_OUT: 'orange', INVESTMENT_PURCHASE: 'purple', INVESTMENT_SALE: 'pink', DEPOSIT_CRYPTO: 'teal', WITHDRAWAL_CRYPTO: 'cyan' };
    return colors[type] || 'gray';
  };

  return (
    <DashboardLayout>
      <Box py={8} px={{ base: 4, md: 8 }}>
        <Heading as="h1" size="xl" mb={8} textAlign="center">
          <Icon as={FiDollarSign} mr={3} verticalAlign="middle" /> My Wallet
        </Heading>

        {/* Wallet Balance Section */}
        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor} mb={8}>
          <Heading as="h2" size="lg" mb={4}>Current Balances</Heading>
          {loadingBalance && <SkeletonText mt="4" noOfLines={4} spacing="4" />}
          {!loadingBalance && walletError && (
            <Alert status="error"><AlertIcon />{typeof walletError === 'string' ? walletError : JSON.stringify(walletError)}</Alert>
          )}
          {!loadingBalance && !walletError && (
            <VStack spacing={4} align="stretch">
              {walletBalance && (
                <Stat>
                  <StatLabel fontSize="md">{walletBalance.currency} Balance (Fiat)</StatLabel>
                  <StatNumber fontSize="3xl" fontWeight="bold">{formatCurrency(walletBalance.balance, walletBalance.currency)}</StatNumber>
                </Stat>
              )}
              {cryptoBalancesData && Object.keys(cryptoBalancesData).length > 0 && (
                <Box>
                  <Text fontWeight="bold" fontSize="md" mt={4} mb={2}>Crypto Balances:</Text>
                  <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                    {Object.entries(cryptoBalancesData).map(([currencyVal, amountStr]) => {
                      const token = SUPPORTED_CRYPTO_CURRENCIES.find(c => c.value === currencyVal);
                      return (
                        <Stat key={currencyVal} p={3} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                          <StatLabel>{token?.label || currencyVal}</StatLabel>
                          <StatNumber>{formatCryptoAmount(amountStr, currencyVal)}</StatNumber>
                        </Stat>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              )}
              {(!walletBalance && (!cryptoBalancesData || Object.keys(cryptoBalancesData).length === 0)) && (
                <Text>No balance information available. Try refreshing.</Text>
              )}
            </VStack>
          )}
        </Box>

        {/* Deposit/Withdrawal Forms Section */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} mb={8}>
          {/* Stripe Fiat Deposit */}
          <Elements stripe={stripePromise}><StripeDepositForm /></Elements>
          
          {/* Fiat Withdrawal Form */}
          <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor}>
            <Heading as="h3" size="md" mb={4}>Withdraw Fiat (USD)</Heading>
            <VStack spacing={4}>
              <FormControl id="withdrawalAmount">
                <FormLabel>Amount to Withdraw (USD)</FormLabel>
                <Input type="number" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} placeholder="e.g., 50.00" min="0.01" step="0.01" />
              </FormControl>
              <Button colorScheme="red" leftIcon={<FiTrendingDown />} onClick={handleFiatWithdraw} isLoading={isSubmittingWalletAction} isDisabled={isSubmittingWalletAction} isFullWidth>Withdraw USD</Button>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Crypto Deposit/Withdrawal Section */}
        <Heading as="h2" size="xl" my={8} textAlign="center">Crypto Wallet</Heading>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} mb={8}>
            {/* Crypto Deposit */}
            <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor}>
                <Heading as="h3" size="md" mb={4}>Crypto Deposit</Heading>
                <VStack spacing={4}>
                    <FormControl id="cryptoDepositCurrency">
                        <FormLabel>Select Currency to Deposit</FormLabel>
                        <Select value={selectedCryptoForDeposit} onChange={(e) => { setSelectedCryptoForDeposit(e.target.value); setDepositAddressInfo(null); /* Clear old address */ }}>
                            {SUPPORTED_CRYPTO_CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </Select>
                    </FormControl>
                    <Button colorScheme="blue" leftIcon={<FiLogIn />} onClick={handleShowDepositAddress} isLoading={isFetchingDepositAddress} isFullWidth>Show My Deposit Address</Button>
                    {depositAddressInfo && depositAddressInfo.currency === selectedCryptoForDeposit && (
                        <VStack mt={4} p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor} spacing={3} align="center">
                            <Text fontWeight="bold">Your {depositAddressInfo.currency.replace('_', ' ')} Deposit Address:</Text>
                            <QRCode value={depositAddressInfo.address} size={160} level="H" imageSettings={{src: `/icons/crypto/${depositAddressInfo.currency.split('_')[0].toLowerCase()}.svg`, height:30, width:30, excavate: true}}/>
                            <InputGroup size="md">
                                <Input value={depositAddressInfo.address} isReadOnly pr="4.5rem" fontFamily="monospace"/>
                                <InputRightElement width="4.5rem">
                                <IconButton h="1.75rem" size="sm" onClick={() => { navigator.clipboard.writeText(depositAddressInfo.address); setHasCopied(true); setTimeout(()=>setHasCopied(false), 2000);}} icon={hasCopied ? <FiCheckCircle /> : <FiCopy />} aria-label="Copy address" />
                                </InputRightElement>
                            </InputGroup>
                            <Alert status="warning" size="sm" borderRadius="md">
                                <AlertIcon />
                                Only send {depositAddressInfo.currency.replace('_', ' ')} to this address on the Polygon network. Other assets or networks may result in loss.
                            </Alert>
                        </VStack>
                    )}
                </VStack>
            </Box>

            {/* Crypto Withdrawal */}
            <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor}>
                <Heading as="h3" size="md" mb={4}>Crypto Withdrawal</Heading>
                <VStack spacing={4}>
                    <FormControl id="cryptoWithdrawalCurrency">
                        <FormLabel>Select Currency to Withdraw</FormLabel>
                        <Select value={selectedCryptoForWithdrawal} onChange={(e) => setSelectedCryptoForWithdrawal(e.target.value)}>
                             {SUPPORTED_CRYPTO_CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </Select>
                         <Text fontSize="xs" color="gray.500" mt={1}>Available: {formatCryptoAmount(cryptoBalancesData?.[selectedCryptoForWithdrawal] || '0', selectedCryptoForWithdrawal)}</Text>
                    </FormControl>
                    <FormControl id="withdrawalToAddress" isRequired>
                        <FormLabel>Recipient Address</FormLabel>
                        <Input type="text" value={withdrawalToAddress} onChange={(e) => setWithdrawalToAddress(e.target.value)} placeholder={`Enter ${selectedCryptoForWithdrawal.split('_')[0]} address on Polygon`} />
                    </FormControl>
                    <FormControl id="withdrawalAmountCrypto" isRequired>
                        <FormLabel>Amount to Withdraw</FormLabel>
                        <Input type="number" value={withdrawalAmountCrypto} onChange={(e) => setWithdrawalAmountCrypto(e.target.value)} placeholder="e.g., 10.50" min="0.000001" step="0.000001"/>
                    </FormControl>
                    <Button colorScheme="orange" leftIcon={<FiLogOut />} onClick={handleCryptoWithdraw} isLoading={isSubmittingWalletAction} isDisabled={isSubmittingWalletAction} isFullWidth>Withdraw Crypto</Button>
                </VStack>
            </Box>
        </SimpleGrid>
        
        {/* Transactions History Section */}
        <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" borderWidth="1px" borderColor={borderColor} mt={10}>
          <Heading as="h2" size="lg" mb={4}>Transaction History</Heading>
          {loadingTransactions && transactions.length === 0 && <SkeletonText mt="4" noOfLines={5} spacing="4" />}
          {!loadingTransactions && walletError && transactions.length === 0 && (
             <Alert status="error"><AlertIcon />Failed to load transactions: {typeof walletError === 'string' ? walletError : JSON.stringify(walletError)}</Alert>
          )}
          {!loadingTransactions && !walletError && transactions.length === 0 && (
            <Text textAlign="center" py={10}>No transactions yet.</Text>
          )}

          {transactions.length > 0 && (
            <Box overflowX="auto">
              <Table variant="simple" size="md">
                <Thead>
                  <Tr>
                    <Th>Date</Th><Th>Type</Th><Th>Description</Th><Th isNumeric>Amount</Th><Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((tx) => (
                    <Tr key={tx.id}>
                      <Td>{new Date(tx.transactionDate).toLocaleDateString()}</Td>
                      <Td><Tag colorScheme={_getTransactionTypeTagColor(tx.type)} size="sm">{tx.type.replace('_', ' ')}</Tag></Td>
                      <Td>{tx.description || 'N/A'}</Td>
                      <Td isNumeric color={['DEPOSIT', 'DEPOSIT_CRYPTO', 'TRANSFER_IN', 'INVESTMENT_SALE'].includes(tx.type) ? 'green.500' : 'red.500'}>
                        {['DEPOSIT', 'DEPOSIT_CRYPTO', 'TRANSFER_IN', 'INVESTMENT_SALE'].includes(tx.type) ? '+' : '-'}
                        {/* Amount for crypto is already human-readable from context, fiat needs /100 */}
                        {tx.type.includes('CRYPTO') ? formatCryptoAmount(tx.amount.toString(), tx.currency) : _formatCurrency(tx.amount, tx.currency)}
                      </Td>
                      <Td><Tag colorScheme={tx.status === 'COMPLETED' ? 'green' : tx.status.startsWith('PENDING') ? 'yellow' : 'red'} size="sm">{tx.status.replace('_', ' ')}</Tag></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}

          {transactionPagination.hasMore && transactions.length > 0 && (
            <Flex justifyContent="center" mt={6}>
              <Button onClick={() => fetchTransactions(10, true)} isLoading={loadingTransactions} leftIcon={<FiRotateCw />} colorScheme="gray">Load More Transactions</Button>
            </Flex>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default WalletPage;
