import React from 'react';
import { Target, TrendingUp, Award } from 'lucide-react';

interface GoalProgressProps {
  teamProgress: {
    calls: { current: number; target: number; percentage: number };
    meetings: { current: number; target: number; percentage: number };
    deals: { current: number; target: number; percentage: number };
  };
  loading?: boolean;
}

export const GoalProgressCard: React.FC<GoalProgressProps> = ({ teamProgress, loading }) => {
  const goals = [
    { 
      label: 'שיחות', 
      current: teamProgress.calls.current, 
      target: teamProgress.calls.target,
      percentage: teamProgress.calls.percentage,
      icon: Target,
      color: 'purple'
    },
    { 
      label: 'פגישות', 
      current: teamProgress.meetings.current, 
      target: teamProgress.meetings.target,
      percentage: teamProgress.meetings.percentage,
      icon: TrendingUp,
      color: 'emerald'
    },
    { 
      label: 'עסקאות', 
      current: teamProgress.deals.current, 
      target: teamProgress.deals.target,
      percentage: teamProgress.deals.percentage,
      icon: Award,
      color: 'amber'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      purple: { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">יעדים היום</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">צוות מלא</p>
          </div>
        </div>
      </div>

        {/* Goals List */}
        <div className="space-y-5">
          {loading ? (
            <div className="text-center py-6 text-slate-400 text-sm">טוען...</div>
          ) : (
            goals.map((goal, index) => {
              const Icon = goal.icon;
              const colors = getColorClasses(goal.color);
              const remaining = goal.target - goal.current;
              const isComplete = goal.percentage >= 100;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{goal.label}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-base font-bold text-slate-900 dark:text-white">{goal.current}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/{goal.target}</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 right-0 h-full rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-emerald-500' : colors.bg
                      }`}
                      style={{ width: `${Math.min(100, goal.percentage)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isComplete ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Award className="w-3 h-3" /> הושלם
                        </span>
                      ) : (
                        `עוד ${remaining}`
                      )}
                    </span>
                    <span className={`text-xs font-semibold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : colors.text}`}>
                      {goal.percentage}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </div>
  );
};
