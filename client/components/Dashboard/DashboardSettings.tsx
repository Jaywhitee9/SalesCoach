import React, { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '../Common/Button';
import { Modal } from '../Common/Modal';
import { useDashboardCustomization } from './DashboardCustomizationProvider';

const DASHBOARD_SECTIONS = [
  { id: 'kpis', label: 'מדדים ראשיים (KPIs)' },
  { id: 'live-activity', label: 'פעילות חיה' },
  { id: 'goal-progress', label: 'התקדמות יעדים' },
  { id: 'ai-insights', label: 'תובנות AI' },
  { id: 'pipeline', label: 'פייפליין והכנסות' },
  { id: 'team-performance', label: 'ביצועי צוות' },
  { id: 'attention-queue', label: 'דורש תשומת לב' },
];

const ALL_KPIS = [
  { id: 'calls', label: 'מספר שיחות' },
  { id: 'conversions', label: 'אחוז המרה (צוות)' },
  { id: 'avgDuration', label: 'משך ממוצע' },
  { id: 'aiScore', label: 'ציון AI' }
];

export const DashboardSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    hiddenWidgets,
    kpiSelection,
    toggleWidgetVisibility,
    updateKPISelection,
    resetToDefaults,
  } = useDashboardCustomization();

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        הגדרות
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="התאמה אישית של Dashboard">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">סקשנים מוצגים</h3>
            <div className="space-y-1">
              {DASHBOARD_SECTIONS.map(section => {
                const isHidden = hiddenWidgets.includes(section.id);
                return (
                  <label key={section.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2.5 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      onChange={() => toggleWidgetVisibility(section.id)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className={`text-sm ${isHidden ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{section.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">מדדים ראשיים (4 מקסימום)</h3>
            <div className="space-y-1">
              {ALL_KPIS.map(kpi => {
                const isSelected = kpiSelection.includes(kpi.id);
                return (
                  <label key={kpi.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2.5 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isSelected && kpiSelection.length >= 4}
                      onChange={() => {
                        const newKPIs = isSelected
                          ? kpiSelection.filter(k => k !== kpi.id)
                          : [...kpiSelection, kpi.id];
                        updateKPISelection(newKPIs);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{kpi.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm('האם לאפס את כל ההגדרות לברירת מחדל? הפעולה תמחק את כל ההתאמות שלך.')) {
                  resetToDefaults();
                  setIsOpen(false);
                }
              }}
              className="flex items-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <RotateCcw className="w-4 h-4" />
              איפוס להגדרות ברירת מחדל
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
