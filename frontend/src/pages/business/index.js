import React from 'react';
import { Box } from '@chakra-ui/react';
import BusinessDashboard from '../../components/Business/BusinessDashboard';
import { BusinessProvider } from '../../context/BusinessContext';
import ErrorWrapper from '../../components/ErrorWrapper';

const BusinessPage = () => {
  return (
    <BusinessProvider>
      <Box>
        <ErrorWrapper componentName="Business Dashboard">
          <BusinessDashboard />
        </ErrorWrapper>
      </Box>
    </BusinessProvider>
  );
};

export default BusinessPage;
