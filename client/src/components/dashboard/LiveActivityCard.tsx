import React, { useEffect, useState } from 'react';
import { Phone, Clock, CheckCircle, Activity } from 'lucide-react';

interface LiveActivityProps {
  activities: Array<{
    id: string;
    agentName: string;
    agentAvatar?: string;
    action: string; // 'in_call' | 'call_ended' | 'idle'
    duration?: number; // seconds
    quality?: number; // 0-100
    timestamp: string;
  }>;
  loading?: boolean;
}

export const LiveActivityCard: React.FC<LiveActivityProps> = ({ activities, loading }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((currentTime.getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `לפני ${seconds} שניות`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `לפני ${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    return `לפני ${hours} שעות`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusStyle = (action: string) => {
    switch (action) {
      case 'in_call': return { icon: Phone, color: '#059669', dotColor: '#10b981' };
      case 'call_ended': return { icon: CheckCircle, color: '#2563eb', dotColor: '#3b82f6' };
      default: return { icon: Clock, color: '#94a3b8', dotColor: '#cbd5e1' };
    }
  };

  const activeCallsCount = activities.filter(a => a.action === 'in_call').length;

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4" style={{ color: '#059669' }} strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold" style={{ color: '#1e293b' }}>פעילות בזמן אמת</h3>
        </div>
        {activeCallsCount > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5" style={{ background: '#ecfdf5', color: '#059669' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            {activeCallsCount} בשיחה
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#059669' }} />
            <span className="text-[13px]" style={{ color: '#94a3b8' }}>טוען...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: '#d1d5db' }} strokeWidth={1.5} />
            <p className="text-[13px] font-medium" style={{ color: '#64748b' }}>אין פעילות אחרונה</p>
            <p className="text-[12px] mt-0.5" style={{ color: '#94a3b8' }}>הפעילות תופיע כאן</p>
          </div>
        ) : (
          activities.map((activity) => {
            const status = getStatusStyle(activity.action);
            const Icon = status.icon;
            const isActive = activity.action === 'in_call';

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafbfc] transition-colors"
                style={{ borderBottom: '1px solid #f8fafc' }}
              >
                <div className="relative shrink-0">
                  <img
                    src={activity.agentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.agentName)}&background=random&size=32`}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  {isActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: '#10b981', border: '2px solid white' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: '#1e293b' }}>
                    {activity.agentName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Icon className="w-3 h-3" style={{ color: status.color }} />
                    <span className="text-[12px]" style={{ color: '#64748b' }}>
                      {activity.action === 'in_call' && `בשיחה ${activity.duration ? formatDuration(activity.duration) : ''}`}
                      {activity.action === 'call_ended' && `סיים שיחה`}
                      {activity.action === 'idle' && 'מוכן'}
                    </span>
                    {activity.quality !== undefined && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: activity.quality >= 80 ? '#ecfdf5' : activity.quality >= 60 ? '#fffbeb' : '#fef2f2',
                          color: activity.quality >= 80 ? '#059669' : activity.quality >= 60 ? '#d97706' : '#dc2626'
                        }}
                      >
                        {activity.quality}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] whitespace-nowrap shrink-0" style={{ color: '#94a3b8' }}>
                  {getTimeAgo(activity.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
