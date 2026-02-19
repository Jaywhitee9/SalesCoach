import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  UserCog
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface LeadDistributionSettingsProps {
  orgId: string;
}

export const LeadDistributionSettings: React.FC<LeadDistributionSettingsProps> = ({ orgId }) => {
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [distributionMethod, setDistributionMethod] = useState<'round_robin' | 'manual'>('round_robin');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [repsCount, setRepsCount] = useState(0);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);

        // Get distribution settings
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/org/distribution-settings?organizationId=${orgId}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setAutoDistribute(result.settings.auto_distribute || false);
            setDistributionMethod(result.settings.distribution_method || 'round_robin');
          }
        }

        // Get rep count
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: false })
          .eq('organization_id', orgId)
          .in('role', ['rep', 'manager']);

        if (!error && profiles) {
          setRepsCount(profiles.length);
        }
      } catch (err) {
        console.error('Failed to fetch distribution settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (orgId) {
      fetchSettings();
    }
  }, [orgId]);

  // Save settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/org/distribution-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          organizationId: orgId,
          auto_distribute: autoDistribute,
          distribution_method: distributionMethod
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Failed to save distribution settings:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              חלוקת לידים אוטומטית
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              בחר כיצד לידים חדשים יתחלקו בין הנציגים בארגון. ניתן לבחור בין חלוקה אוטומטית להקצאה ידנית.
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Mode Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">מצב חלוקה</h4>

        <div className="space-y-4">
          {/* Option 1: Automatic Distribution */}
          <button
            onClick={() => setAutoDistribute(true)}
            className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
              autoDistribute
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${autoDistribute ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Zap className={`w-5 h-5 ${autoDistribute ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-slate-900 dark:text-white">חלוקה אוטומטית</h5>
                  {autoDistribute && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-right">
                  לידים חדשים יתחלקו אוטומטית בין הנציגים בצורה שוויונית (Round Robin).
                  כל ליד חדש יוקצה אוטומטית לנציג הבא בתור.
                </p>
                {autoDistribute && repsCount > 0 && (
                  <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span><strong>{repsCount} נציגים</strong> יקבלו לידים אוטומטית</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Option 2: Manual Distribution */}
          <button
            onClick={() => setAutoDistribute(false)}
            className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
              !autoDistribute
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${!autoDistribute ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <UserCog className={`w-5 h-5 ${!autoDistribute ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-slate-900 dark:text-white">הקצאה ידנית</h5>
                  {!autoDistribute && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-right">
                  לידים חדשים יישארו לא מוקצים ויופיעו במסך "לידים לא מוקצים".
                  מנהל המכירות יוכל להקצות אותם ידנית לנציגים לפי שיקול דעתו.
                </p>
                {!autoDistribute && (
                  <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>מנהל המכירות יקצה לידים ידנית</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Distribution Method (only for automatic) */}
        {autoDistribute && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">שיטת חלוקה</h5>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={distributionMethod === 'round_robin'}
                  onChange={() => setDistributionMethod('round_robin')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Round Robin</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    חלוקה שוויונית - כל נציג מקבל ליד בתורו
                  </p>
                </div>
              </label>
              {/* Future: Add more distribution methods like weighted, skill-based, etc */}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-semibold">טיפים לשימוש:</p>
            <ul className="list-disc list-inside space-y-1 mr-2">
              <li><strong>אוטומטי:</strong> מומלץ לארגונים עם צוות גדול ותעבורת לידים גבוהה</li>
              <li><strong>ידני:</strong> מומלץ כאשר צריך לבחור נציג לפי מומחיות, זמינות או סוג ליד</li>
              <li>ניתן לשנות את ההגדרה בכל עת ללא השפעה על לידים קיימים</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>שומר...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>שמור הגדרות</span>
            </>
          )}
        </button>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">ההגדרות נשמרו בהצלחה!</span>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 animate-in fade-in">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">שגיאה בשמירת ההגדרות</span>
          </div>
        )}
      </div>
    </div>
  );
};
