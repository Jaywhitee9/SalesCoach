import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../src/lib/supabaseClient';

interface DashboardCustomizationContextType {
  hiddenWidgets: string[];
  kpiSelection: string[];
  loading: boolean;
  toggleWidgetVisibility: (widgetId: string) => void;
  updateKPISelection: (kpis: string[]) => void;
  resetToDefaults: () => Promise<void>;
}

const DashboardCustomizationContext = createContext<DashboardCustomizationContextType | null>(null);

export const useDashboardCustomization = () => {
  const context = useContext(DashboardCustomizationContext);
  if (!context) {
    throw new Error('useDashboardCustomization must be used within DashboardCustomizationProvider');
  }
  return context;
};

interface Props {
  orgId?: string;
  children: React.ReactNode;
}

export const DashboardCustomizationProvider: React.FC<Props> = ({ orgId, children }) => {
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [kpiSelection, setKpiSelection] = useState<string[]>(['calls', 'conversions', 'avgDuration', 'aiScore']);
  const [loading, setLoading] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenRef = useRef(hiddenWidgets);
  const kpiRef = useRef(kpiSelection);

  hiddenRef.current = hiddenWidgets;
  kpiRef.current = kpiSelection;

  useEffect(() => {
    loadLayout();
  }, [orgId]);

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      : null;
  }, []);

  const loadLayout = async () => {
    try {
      const headers = await getAuthHeader();
      if (!headers) { setLoading(false); return; }

      const orgParam = orgId ? `?organizationId=${orgId}` : '';
      const response = await fetch(`/api/dashboard/layout${orgParam}`, { headers });
      const data = await response.json();

      if (data.success) {
        setHiddenWidgets(data.hidden_widgets || []);
        setKpiSelection(data.kpi_selection || ['calls', 'conversions', 'avgDuration', 'aiScore']);
      }
    } catch (error) {
      console.error('[DashboardCustomization] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const persistSave = useCallback(async (
    hidden: string[],
    kpis: string[]
  ) => {
    try {
      const headers = await getAuthHeader();
      if (!headers) return;

      await fetch('/api/dashboard/layout', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          organizationId: orgId,
          hidden_widgets: hidden,
          kpi_selection: kpis,
        })
      });
    } catch (error) {
      console.error('[DashboardCustomization] Save error:', error);
    }
  }, [orgId, getAuthHeader]);

  const debouncedSave = useCallback((
    hidden: string[],
    kpis: string[]
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistSave(hidden, kpis);
    }, 500);
  }, [persistSave]);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    const newHidden = hiddenRef.current.includes(widgetId)
      ? hiddenRef.current.filter(id => id !== widgetId)
      : [...hiddenRef.current, widgetId];
    
    setHiddenWidgets(newHidden);
    debouncedSave(newHidden, kpiRef.current);
  }, [debouncedSave]);

  const updateKPISelection = useCallback((kpis: string[]) => {
    setKpiSelection(kpis);
    debouncedSave(hiddenRef.current, kpis);
  }, [debouncedSave]);

  const resetToDefaults = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      if (!headers) return;

      const orgParam = orgId ? `?organizationId=${orgId}` : '';
      await fetch(`/api/dashboard/layout${orgParam}`, { method: 'DELETE', headers });

      setHiddenWidgets([]);
      setKpiSelection(['calls', 'conversions', 'avgDuration', 'aiScore']);
    } catch (error) {
      console.error('[DashboardCustomization] Reset error:', error);
    }
  }, [orgId, getAuthHeader]);

  return (
    <DashboardCustomizationContext.Provider value={{
      hiddenWidgets,
      kpiSelection,
      loading,
      toggleWidgetVisibility,
      updateKPISelection,
      resetToDefaults,
    }}>
      {children}
    </DashboardCustomizationContext.Provider>
  );
};
