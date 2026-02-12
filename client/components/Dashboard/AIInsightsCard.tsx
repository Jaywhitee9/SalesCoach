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

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return { iconColor: '#d97706', dotColor: '#f59e0b', bgHover: '#fffbeb' };
      case 'opportunity':
        return { iconColor: '#059669', dotColor: '#10b981', bgHover: '#ecfdf5' };
      case 'success':
        return { iconColor: '#2563eb', dotColor: '#3b82f6', bgHover: '#eff6ff' };
      default:
        return { iconColor: '#64748b', dotColor: '#94a3b8', bgHover: '#f8fafc' };
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4" style={{ color: '#2563eb' }} strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold" style={{ color: '#1e293b' }}>המלצות</h3>
        </div>
        {insights.length > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>
            {insights.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#2563eb' }} />
            <span className="text-[13px]" style={{ color: '#94a3b8' }}>טוען...</span>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-6 h-6 mx-auto mb-2" style={{ color: '#d1d5db' }} strokeWidth={1.5} />
            <p className="text-[13px] font-medium" style={{ color: '#64748b' }}>הכל תקין</p>
            <p className="text-[12px] mt-0.5" style={{ color: '#94a3b8' }}>אין המלצות כרגע</p>
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, index) => {
              const Icon = getIcon(insight.icon);
              const styles = getTypeStyles(insight.type);

              return (
                <div
                  key={index}
                  className="p-3 rounded-md transition-colors cursor-default hover:bg-[#f8fafc]"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.iconColor }} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold leading-snug" style={{ color: '#1e293b' }}>{insight.title}</h4>
                      <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#64748b' }}>{insight.description}</p>
                      <button
                        className="text-[12px] font-medium mt-1.5 hover:underline"
                        style={{ color: styles.iconColor }}
                      >
                        {insight.action} →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
