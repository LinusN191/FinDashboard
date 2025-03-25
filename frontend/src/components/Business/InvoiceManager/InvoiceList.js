import React, { useState } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Flex,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  HStack,
  useColorModeValue,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiFilter, 
  FiDownload, 
  FiPrinter,
  FiSearch,
  FiChevronDown,
  FiSend,
  FiDollarSign,
  FiEye
} from 'react-icons/fi';
import { useBusiness } from '../../../context/BusinessContext';
import InvoiceForm from './InvoiceForm'; // We'll create this next

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// Function to get status badge color
const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return 'green';
    case 'pending':
      return 'yellow';
    case 'overdue':
      return 'red';
    case 'draft':
      return 'gray';
    case 'canceled':
      return 'purple';
    default:
      return 'gray';
  }
};

const InvoiceList = ({ invoices = [], businessId }) => {
  const { 
    deleteInvoice
  } = useBusiness();
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filter, setFilter] = useState({
    status: '',
    search: '',
    dateRange: 'all'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  
  // UI Colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    // Filter by status
    if (filter.status && invoice.status !== filter.status) {
      return false;
    }
    
    // Filter by search term
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      const matchesCustomer = invoice.customerName.toLowerCase().includes(searchTerm);
      const matchesInvoiceNumber = invoice.invoiceNumber.toLowerCase().includes(searchTerm);
      
      if (!matchesCustomer && !matchesInvoiceNumber) {
        return false;
      }
    }
    
    // Filter by date range
    if (filter.dateRange !== 'all') {
      const now = new Date();
      const invoiceDate = new Date(invoice.issueDate);
      
      if (filter.dateRange === 'thisMonth') {
        if (invoiceDate.getMonth() !== now.getMonth() || 
            invoiceDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (filter.dateRange === 'lastMonth') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        
        if (invoiceDate.getMonth() !== lastMonth || 
            invoiceDate.getFullYear() !== lastMonthYear) {
          return false;
        }
      } else if (filter.dateRange === 'thisYear') {
        if (invoiceDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle edit invoice
  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsEditing(true);
    onOpen();
  };
  
  // Handle create invoice
  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsEditing(false);
    onOpen();
  };
  
  // Handle delete invoice
  const handleDeleteInvoice = async (invoice) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      const success = await deleteInvoice(businessId, invoice.id);
      
      if (!success) {
        setError('Failed to delete invoice. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle view invoice (placeholder for now)
  const handleViewInvoice = (invoice) => {
    console.log('View invoice:', invoice);
  };
  
  // Handle mark as paid (placeholder for now)
  const handleMarkAsPaid = (invoice) => {
    console.log('Mark as paid:', invoice);
  };
  
  // Handle send invoice (placeholder for now)
  const handleSendInvoice = (invoice) => {
    console.log('Send invoice:', invoice);
  };
  
  return (
    <Box>
      {/* Error message */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Box 
        mb={4} 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Text fontSize="lg" fontWeight="medium" mb={3}>
          Invoices & Actions
        </Text>
        
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          gap={4}
          wrap="wrap"
        >
          {/* Search */}
          <InputGroup maxW={{ base: "100%", md: "220px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input 
              placeholder="Search invoices..." 
              value={filter.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </InputGroup>
          
          {/* Status filter */}
          <Select 
            placeholder="All Statuses" 
            maxW={{ base: "100%", md: "150px" }}
            value={filter.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="canceled">Canceled</option>
          </Select>
          
          {/* Date range filter */}
          <Select 
            placeholder="Date Range" 
            maxW={{ base: "100%", md: "150px" }}
            value={filter.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
          </Select>
          
          <HStack ml={{ base: 0, md: 'auto' }}>
            <Button 
              leftIcon={<FiPlus />} 
              colorScheme="blue"
              onClick={handleCreateInvoice}
            >
              Create Invoice
            </Button>
            
            <Menu>
              <MenuButton as={Button} rightIcon={<FiChevronDown />} variant="outline">
                Actions
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiDownload />}>Export Invoices</MenuItem>
                <MenuItem icon={<FiPrinter />}>Batch Print</MenuItem>
                <MenuItem icon={<FiFilter />}>Clear Filters</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>
      
      {/* Invoices Table */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg"
        borderColor={borderColor}
        overflow="hidden"
      >
        {isDeleting && (
          <Flex justify="center" align="center" py={4}>
            <Spinner mr={2} />
            <Text>Deleting invoice...</Text>
          </Flex>
        )}
        
        {filteredInvoices.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text>No invoices found. Adjust filters or create a new invoice.</Text>
          </Box>
        ) : (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Invoice #</Th>
                <Th>Customer</Th>
                <Th>Issue Date</Th>
                <Th>Due Date</Th>
                <Th isNumeric>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredInvoices.map(invoice => (
                <Tr key={invoice.id}>
                  <Td>{invoice.invoiceNumber}</Td>
                  <Td>{invoice.customerName}</Td>
                  <Td>{formatDate(invoice.issueDate)}</Td>
                  <Td>{formatDate(invoice.dueDate)}</Td>
                  <Td isNumeric>{formatCurrency(invoice.total, invoice.currency)}</Td>
                  <Td>
                    <Badge 
                      colorScheme={getStatusColor(invoice.status)}
                      borderRadius="full"
                      px={2}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem 
                          icon={<FiEye />} 
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          View
                        </MenuItem>
                        <MenuItem 
                          icon={<FiEdit2 />} 
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem 
                          icon={<FiSend />} 
                          onClick={() => handleSendInvoice(invoice)}
                        >
                          Send
                        </MenuItem>
                        {invoice.status !== 'paid' && (
                          <MenuItem 
                            icon={<FiDollarSign />} 
                            onClick={() => handleMarkAsPaid(invoice)}
                          >
                            Mark Paid
                          </MenuItem>
                        )}
                        <MenuItem 
                          icon={<FiPrinter />}
                        >
                          Print
                        </MenuItem>
                        <MenuItem 
                          icon={<FiTrash2 />} 
                          color="red.500"
                          onClick={() => handleDeleteInvoice(invoice)}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
      
      {/* Invoice Form Modal - To be implemented */}
      {/* We'll create this component next, for now it's a placeholder */}
      {isOpen && (
        <InvoiceForm
          isOpen={isOpen}
          onClose={onClose}
          businessId={businessId}
          invoice={selectedInvoice}
          isEditing={isEditing}
        />
      )}
    </Box>
  );
};

export default InvoiceList;
