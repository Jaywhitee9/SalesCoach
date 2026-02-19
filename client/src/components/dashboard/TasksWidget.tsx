import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  leads?: {
    id: string;
    full_name: string;
    company: string;
  };
}

export const TasksWidget: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks?completed=false', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('[TasksWidget] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadTasks();
    } catch (error) {
      console.error('[TasksWidget] Complete error:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-lg"></div>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">משימות היום</h3>
        <span className="text-sm text-slate-500">{tasks.length} פעילות</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
          <p>כל המשימות הושלמו!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.slice(0, 5).map(task => {
            const dueDate = new Date(task.due_date);
            const isOverdue = dueDate < new Date();
            const isDueSoon = dueDate.getTime() - Date.now() < 2 * 60 * 60 * 1000;

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <button
                  onClick={() => completeTask(task.id)}
                  className="mt-1 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Circle className="w-5 h-5" />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{task.title}</p>
                  {task.leads && (
                    <p className="text-sm text-slate-500 truncate">
                      {task.leads.full_name} • {task.leads.company}
                    </p>
                  )}
                  <div className={`flex items-center gap-1 text-xs mt-1 ${
                    isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {format(dueDate, 'HH:mm', { locale: he })}
                    {isOverdue && ' (באיחור)'}
                    {isDueSoon && !isOverdue && ' (דחוף)'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
