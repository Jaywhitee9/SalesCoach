import React, { useState } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const PipelineWidget: React.FC<WidgetProps> = () => {
  const { funnelData, centerType } = useDashboardData();
  const [expanded, setExpanded] = useState(true);

  const maxPipelineValue = Math.max(...(funnelData.length ? funnelData.map(s => s.value) : [0])) * 1.1 || 1000;

  const getBarStyles = (index: number) => {
    const opacities = [0.4, 0.55, 0.7, 0.85, 1];
    return { backgroundColor: '#4f46e5', opacity: opacities[index] || 1 };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div
        className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {centerType === 'support' ? 'סטטוס פניות' : 'פייפליין והכנסות'}
          </h3>
          <span className="text-[10px] font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">החודש</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {!expanded && (
        <div className="px-4 py-3">
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            ₪{((funnelData.reduce((sum: number, s: any) => sum + s.value, 0)) / 1000).toLocaleString()}k
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">סה"כ בפייפליין</div>
        </div>
      )}

      {expanded && (
        <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">
          {centerType === 'support' ? (
            [
              { label: 'חדש', value: 15, color: 'bg-rose-500', width: '30%' },
              { label: 'בטיפול', value: 42, color: 'bg-amber-500', width: '65%' },
              { label: 'ממתין', value: 28, color: 'bg-blue-500', width: '45%' },
              { label: 'נפתר', value: 85, color: 'bg-emerald-500', width: '100%' },
            ].map((stage, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-16 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{stage.label}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${stage.color}`} style={{ width: stage.width }} />
                </div>
                <span className="w-10 text-xs font-bold text-slate-900 dark:text-white text-left">{stage.value}</span>
              </div>
            ))
          ) : (
            funnelData.map((stage: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{stage.name}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(stage.value / maxPipelineValue) * 100}%`, ...getBarStyles(index) }}
                  />
                </div>
                <span className="w-16 text-xs font-bold text-slate-900 dark:text-white text-left">₪{(stage.value / 1000).toLocaleString()}k</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(PipelineWidget);
