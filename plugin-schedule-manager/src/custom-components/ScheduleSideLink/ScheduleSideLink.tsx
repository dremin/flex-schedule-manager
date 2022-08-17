import React from 'react';
import { SideLink, Actions } from '@twilio/flex-ui';

interface OwnProps {
  activeView?: string;
  viewName: string;
}

const ScheduleSideLink = (props: OwnProps) => {
  function navigate() {
    Actions.invokeAction('NavigateToView', { viewName: props.viewName });
  };
  
  return (
    <SideLink
      showLabel={true}
      icon="Clock"
      iconActive="Clock"
      isActive={ props.activeView === props.viewName}
      onClick= { navigate }
      key="schedule-manager-side-link"
    >
      Schedule Manager
    </SideLink>
  );
};

export default ScheduleSideLink;