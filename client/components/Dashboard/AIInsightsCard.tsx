import React from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';

interface Insight {
  type: 'warning' | 'opportunity' | 'success' | 'info';
  icon: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIInsightsCardProps {
  insights: Insight[];
  loading?: boolean;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ insights, loading }) => {
  const getIcon = (iconName: string) => {
    const icons: any = {
      AlertTriangle,
      TrendingUp,
      TrendingDown,
      Target,
      Lightbulb
    };
    return icons[iconName] || Lightbulb;
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/10',
          border: 'border-amber-200 dark:border-amber-800',
          icon: 'text-amber-600 dark:text-amber-400',
          title: 'text-amber-900 dark:text-amber-100'
        };
      case 'opportunity':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/10',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: 'text-emerald-600 dark:text-emerald-400',
          title: 'text-emerald-900 dark:text-emerald-100'
        };
      case 'success':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/10',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-900 dark:text-blue-100'
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
          icon: 'text-slate-600 dark:text-slate-400',
          title: 'text-slate-900 dark:text-slate-100'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">המלצות</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">פעולות מומלצות</p>
          </div>
        </div>
        {insights.length > 0 && (
          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md">
            {insights.length}
          </span>
        )}
      </div>

        {/* Insights List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-6 text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-blue-600 rounded-full mx-auto mb-2"></div>
              <p className="text-sm">טוען...</p>
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">הכל תקין</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">אין המלצות כרגע</p>
            </div>
          ) : (
            insights.map((insight, index) => {
              const Icon = getIcon(insight.icon);
              const colors = getColorClasses(insight.type);
              
              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm ${colors.title} mb-1`}>{insight.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">{insight.description}</p>
                      <button className={`text-xs font-medium ${colors.icon} hover:underline`}>
                        {insight.action} →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </div>
  );
};
