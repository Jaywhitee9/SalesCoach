import React from 'react';
import { TasksWidget as OriginalTasksWidget } from '../TasksWidget';
import type { WidgetProps } from './types';

const TasksWidgetGrid: React.FC<WidgetProps> = () => {
  return <OriginalTasksWidget />;
};

export default React.memo(TasksWidgetGrid);
