import React, { useState, useEffect } from 'react';
import { Bell, Check, AlertCircle, Target, TrendingUp } from 'lucide-react';

interface Notification {
  id: string;
  type: 'reminder' | 'achievement' | 'alert' | 'mission' | 'lead' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationsWidget: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10&unread_only=false', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('[NotificationsWidget] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      loadNotifications();
    } catch (error) {
      console.error('[NotificationsWidget] Mark read error:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Target className="w-5 h-5 text-emerald-600" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'mission': return <TrendingUp className="w-5 h-5 text-indigo-600" />;
      default: return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-lg"></div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">התראות</h3>
        {unreadCount > 0 && (
          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p>אין התראות חדשות</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                notification.is_read
                  ? 'bg-slate-50 dark:bg-slate-800/50'
                  : 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900'
              }`}
            >
              <div className="mt-1">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{notification.title}</p>
                {notification.message && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{notification.message}</p>
                )}
              </div>
              {!notification.is_read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-slate-400 hover:text-emerald-600 transition-colors"
                  title="סמן כנקרא"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
