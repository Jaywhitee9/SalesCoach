import React, { useMemo, useCallback } from 'react';
import { Check, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface Task {
  id: string;
  title: string;
  leadName: string;
  dueDate: string;
  rawDate?: string;
  completed: boolean;
}

interface TasksPanelProps {
  tasks: Task[];
  loading: boolean;
  filter: 'day' | 'week' | 'month' | 'overdue';
  overdueCount: number;
  onFilterChange: (filter: 'day' | 'week' | 'month' | 'overdue') => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onAddTask: () => void;
  onNavigateToTasks?: () => void;
}

export const TasksPanel = React.memo<TasksPanelProps>(({
  tasks,
  loading,
  filter,
  overdueCount,
  onFilterChange,
  onToggleTask,
  onAddTask,
  onNavigateToTasks
}) => {
  const handleToggle = useCallback((id: string, completed: boolean) => {
    onToggleTask(id, completed);
  }, [onToggleTask]);

  return (
    <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base">משימות</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 font-medium rounded-lg"
          onClick={onNavigateToTasks}
        >
          הכל ←
        </Button>
      </div>

      {/* Time Filter */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
        {(['day', 'week', 'month', 'overdue'] as const).map((range) => (
          <button
            key={range}
            onClick={() => onFilterChange(range)}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all relative ${
              filter === range
                ? range === 'overdue'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {range === 'day' ? 'היום' : range === 'week' ? 'השבוע' : range === 'month' ? 'החודש' : 'באיחור'}
            {range === 'overdue' && overdueCount > 0 && (
              <span className="absolute -top-2 -left-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-slate-200 border-t-brand-500 rounded-full"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              אין משימות {filter === 'day' ? 'להיום' : filter === 'week' ? 'לשבוע' : filter === 'month' ? 'לחודש' : 'באיחור'}
            </p>
            <p className="text-slate-400 text-xs mt-1">🎉 הכל בסדר!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                task.completed
                  ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-800 shadow-sm hover:shadow-md'
              }`}
              onClick={() => handleToggle(task.id, task.completed)}
            >
              {/* Checkbox */}
              <div className="mt-0.5 flex-shrink-0">
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20'
                  }`}
                >
                  {task.completed && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold leading-tight transition-colors ${
                    task.completed
                      ? 'text-slate-400 dark:text-slate-500 line-through'
                      : 'text-slate-800 dark:text-slate-200 group-hover:text-brand-600'
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md font-medium">
                    {task.leadName}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.dueDate}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full mt-4 border-dashed border-2 text-slate-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 py-2.5 font-medium"
        onClick={onAddTask}
      >
        + הוסף משימה חדשה
      </Button>
    </div>
  );
});

TasksPanel.displayName = 'TasksPanel';
