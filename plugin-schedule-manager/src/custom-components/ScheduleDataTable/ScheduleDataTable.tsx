import React, { useEffect, useState } from 'react';
import { ColumnDefinition, DataTable } from '@twilio/flex-ui';
import { Button } from '@twilio-paste/core/button';
import { Box } from '@twilio-paste/core/box';
import { PlusIcon } from "@twilio-paste/icons/esm/PlusIcon";

import ScheduleEditor from '../ScheduleEditor/ScheduleEditor';
import { Rule, Schedule } from '../../types/schedule-manager';

interface OwnProps {
  isLoading: boolean;
  rules: Array<Rule>;
  schedules: Array<Schedule>;
}

const ScheduleDataTable = (props: OwnProps) => {
  const [ showPanel, setShowPanel ] = useState(false);
  const [ selectedSchedule, setSelectedSchedule ] = useState(null as Schedule | null);
  
  useEffect(() => {
    if (selectedSchedule !== null) {
      setShowPanel(true);
    }
  }, [selectedSchedule]);
  
  const createScheduleClick = () => {
    setSelectedSchedule(null);
    setShowPanel(true);
  }
  
  const onPanelClosed = () => {
    setShowPanel(false);
    setSelectedSchedule(null);
  }
  
  const onRowClick = (item: Schedule) => {
    setSelectedSchedule(item);
  }
  
  return (
    <>
      <div>
        <Box padding='space60'>
          <Button
            variant="primary"
            disabled={props.isLoading}
            onClick={createScheduleClick}>
            <PlusIcon decorative />
            Create Schedule
          </Button>
        </Box>
        <DataTable
          items={props.schedules}
          isLoading={props.isLoading}
          onRowClick={onRowClick}>
          <ColumnDefinition
            key="name-column"
            header="Name"
            content={(item: Schedule) => {
              return <span>{item.name}</span>
            }} />
          <ColumnDefinition
            key="rules-column"
            header="Rules"
            content={(item: Schedule) => {
              let ruleNames = [] as string[];
              
              item.rules.forEach(ruleGuid => {
                const matchingRule = props.rules.find(rule => rule.id == ruleGuid);
                
                if (matchingRule) {
                  ruleNames.push(matchingRule.name)
                }
              });
              
              return <span>{ruleNames.join(', ')}</span>
            }} />
          <ColumnDefinition
            key="emergency-column"
            header="Emergency closed"
            content={(item: Schedule) => {
              let emergencyStr = 'No';
              
              if (item.emergencyClose === true) {
                emergencyStr = 'Yes';
              }
              
              return <span>{emergencyStr}</span>
            }} />
        </DataTable>
      </div>
      <ScheduleEditor
        onPanelClosed={onPanelClosed}
        rules={props.rules}
        showPanel={showPanel}
        selectedSchedule={selectedSchedule} />
    </>
  );
}

export default ScheduleDataTable;