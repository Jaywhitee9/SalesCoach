import React from 'react';
import { NotificationsWidget as OriginalNotificationsWidget } from '../NotificationsWidget';
import type { WidgetProps } from './types';

const NotificationsWidgetGrid: React.FC<WidgetProps> = () => {
  return <OriginalNotificationsWidget />;
};

export default React.memo(NotificationsWidgetGrid);
