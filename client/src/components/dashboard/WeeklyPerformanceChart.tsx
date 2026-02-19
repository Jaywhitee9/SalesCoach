import React from 'react';
import { Phone } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WeeklyData {
  name: string;
  date: string;
  calls: number;
  successful: number;
  rate: number;
}

interface WeeklyPerformanceChartProps {
  data: WeeklyData[];
  loading: boolean;
  isDarkMode: boolean;
}

export const WeeklyPerformanceChart = React.memo<WeeklyPerformanceChartProps>(({
  data,
  loading,
  isDarkMode
}) => {
  const barColors = isDarkMode ? '#6366f1' : '#4f46e5';
  const barColorsGreen = isDarkMode ? '#10b981' : '#059669';

  const totalCalls = data.reduce((a, b) => a + b.calls, 0);

  if (loading) {
    return (
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 flex flex-col">
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-3 border-slate-200 border-t-brand-500 rounded-full"></div>
            <span className="text-sm text-slate-400">טוען נתונים...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base">ביצועים שבועיים</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            סה"כ {totalCalls} שיחות השבוע
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 bg-brand-500 rounded-full"></span>
            <span className="text-slate-600 dark:text-slate-300">סה"כ שיחות</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            <span className="text-slate-600 dark:text-slate-300">שיחות מוצלחות</span>
          </div>
        </div>
      </div>

      {data.length > 0 ? (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={8} barCategoryGap="20%">
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <Tooltip
                cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', radius: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className={`px-4 py-3 rounded-xl shadow-lg border ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <p className={`font-bold text-sm mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          יום {data.name}
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs flex items-center gap-2">
                            <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                              שיחות: {data.calls}
                            </span>
                          </p>
                          <p className="text-xs flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                              מוצלחות: {data.successful}
                            </span>
                          </p>
                          {data.calls > 0 && (
                            <p className="text-xs font-medium text-amber-500 mt-1">
                              {data.rate}% הצלחה
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="calls" radius={[8, 8, 0, 0]} barSize={32} fill={barColors} name="סה״כ שיחות" />
              <Bar dataKey="successful" radius={[8, 8, 0, 0]} barSize={32} fill={barColorsGreen} name="מוצלחות" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <Phone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">אין נתוני שיחות השבוע</p>
          </div>
        </div>
      )}
    </div>
  );
});

WeeklyPerformanceChart.displayName = 'WeeklyPerformanceChart';
