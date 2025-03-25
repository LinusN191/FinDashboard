import React from 'react';
import { Box } from '@chakra-ui/react';
import GroupDashboard from '../../components/Group/GroupDashboard';
import { GroupProvider } from '../../context/GroupContext';
import ErrorWrapper from '../../components/ErrorWrapper';

const GroupPage = () => {
  return (
    <GroupProvider>
      <Box>
        <ErrorWrapper componentName="Group Investment Dashboard">
          <GroupDashboard />
        </ErrorWrapper>
      </Box>
    </GroupProvider>
  );
};

export default GroupPage;
