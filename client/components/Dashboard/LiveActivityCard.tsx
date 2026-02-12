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

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'in_call': return { icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
      case 'call_ended': return { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      default: return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' };
    }
  };

  const activeCallsCount = activities.filter(a => a.action === 'in_call').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">פעילות בזמן אמת</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">עדכון אוטומטי</p>
          </div>
        </div>
        {activeCallsCount > 0 && (
          <span className="text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            {activeCallsCount} בשיחה
          </span>
        )}
      </div>

        {/* Activity Timeline */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="text-center py-6 text-slate-400 text-sm">טוען...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Clock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">אין פעילות אחרונה</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">הפעילות תופיע כאן</p>
            </div>
          ) : (
            activities.map((activity, idx) => {
              const activityStyle = getActivityIcon(activity.action);
              const Icon = activityStyle.icon;
              const isActive = activity.action === 'in_call';
              
              return (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    isActive ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={activity.agentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.agentName)}&background=random`}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800"
                    />
                    {isActive && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {activity.agentName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Icon className={`w-3.5 h-3.5 ${activityStyle.color}`} />
                      <span>
                        {activity.action === 'in_call' && `בשיחה ${activity.duration ? formatDuration(activity.duration) : ''}`}
                        {activity.action === 'call_ended' && `סיים שיחה`}
                        {activity.action === 'idle' && 'מוכן'}
                      </span>
                      {activity.quality !== undefined && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          activity.quality >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          activity.quality >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {activity.quality}%
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
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
