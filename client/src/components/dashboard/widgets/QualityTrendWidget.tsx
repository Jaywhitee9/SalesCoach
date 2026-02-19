import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const QualityTrendWidget: React.FC<WidgetProps> = () => {
  const { qualityTrend, isDarkMode } = useDashboardData();
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) { setMounted(true); return; }
    if (el.clientWidth > 0 && el.clientHeight > 0) { setMounted(true); return; }
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.contentRect.width > 0) { setMounted(true); obs.disconnect(); }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">מגמת איכות שיחות</h3>
      </div>
      <div ref={ref} className="flex-1 px-4 py-3 min-h-0">
        {mounted && qualityTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={qualityTrend}>
              <defs>
                <linearGradient id="qualityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={isDarkMode ? '#64748b' : '#94a3b8'} />
              <YAxis tick={{ fontSize: 10 }} stroke={isDarkMode ? '#64748b' : '#94a3b8'} domain={[0, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#qualityGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            {qualityTrend.length === 0 ? 'אין נתונים' : 'טוען...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(QualityTrendWidget);
