import React from 'react';
import { Target, TrendingUp, Award, CheckCircle2 } from 'lucide-react';

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
      barColor: '#6366f1'
    },
    {
      label: 'פגישות',
      current: teamProgress.meetings.current,
      target: teamProgress.meetings.target,
      percentage: teamProgress.meetings.percentage,
      icon: TrendingUp,
      barColor: '#2563eb'
    },
    {
      label: 'עסקאות',
      current: teamProgress.deals.current,
      target: teamProgress.deals.target,
      percentage: teamProgress.deals.percentage,
      icon: Award,
      barColor: '#059669'
    }
  ];

  return (
    <div className="bg-white rounded-lg overflow-hidden h-full" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-2.5">
          <Target className="w-4 h-4" style={{ color: '#6366f1' }} strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold" style={{ color: '#1e293b' }}>יעדים היום</h3>
        </div>
      </div>

      {/* Goals */}
      <div className="px-5 py-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#6366f1' }} />
            <span className="text-[13px]" style={{ color: '#94a3b8' }}>טוען...</span>
          </div>
        ) : (
          goals.map((goal, index) => {
            const isComplete = goal.percentage >= 100;
            const barColor = isComplete ? '#059669' : goal.barColor;

            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium" style={{ color: '#475569' }}>{goal.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[15px] font-bold" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{goal.current}</span>
                    <span className="text-[11px]" style={{ color: '#94a3b8' }}>/ {goal.target}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, goal.percentage)}%`, backgroundColor: barColor }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                    {isComplete ? (
                      <span className="flex items-center gap-1" style={{ color: '#059669' }}>
                        <CheckCircle2 className="w-3 h-3" /> הושלם
                      </span>
                    ) : (
                      `עוד ${goal.target - goal.current}`
                    )}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: barColor, fontVariantNumeric: 'tabular-nums' }}>
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
