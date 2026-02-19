import React from 'react';
import { AlertTriangle, Phone, Shield, RefreshCw } from 'lucide-react';

interface NumberHealthAlertProps {
    isVisible: boolean;
    phoneNumber: {
        id: string;
        phone_number: string;
        display_name?: string;
        health_score: number;
        failed_streak: number;
        is_quarantined: boolean;
    };
    onSwitchNumber: () => void;
    onDismiss: () => void;
}

export const NumberHealthAlert: React.FC<NumberHealthAlertProps> = ({
    isVisible,
    phoneNumber,
    onSwitchNumber,
    onDismiss
}) => {
    if (!isVisible) return null;

    const getHealthColor = (score: number) => {
        if (score >= 70) return 'green';
        if (score >= 40) return 'yellow';
        return 'red';
    };

    const healthColor = getHealthColor(phoneNumber.health_score);

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className={`max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 overflow-hidden
            ${phoneNumber.is_quarantined
                    ? 'border-red-500'
                    : healthColor === 'red'
                        ? 'border-red-400'
                        : 'border-yellow-400'
                }`}
            >
                {/* Header */}
                <div className={`px-4 py-3 flex items-center gap-3
               ${phoneNumber.is_quarantined
                        ? 'bg-red-500'
                        : healthColor === 'red'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                >
                    <div className={`p-2 rounded-full ${phoneNumber.is_quarantined ? 'bg-white/20' : 'bg-white'}`}>
                        <AlertTriangle className={`w-5 h-5 
                     ${phoneNumber.is_quarantined
                                ? 'text-white'
                                : healthColor === 'red'
                                    ? 'text-red-600'
                                    : 'text-yellow-600'
                            }`}
                        />
                    </div>
                    <div className="flex-1">
                        <h4 className={`font-bold text-sm ${phoneNumber.is_quarantined ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {phoneNumber.is_quarantined ? '🚨 מספר בהסגר!' : '⚠️ התראת בריאות מספר'}
                        </h4>
                        <p className={`text-xs ${phoneNumber.is_quarantined ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>
                            {phoneNumber.display_name || phoneNumber.phone_number}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Health Score */}
                    <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${healthColor === 'green' ? 'text-green-600' :
                                healthColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {phoneNumber.health_score}%
                        </div>
                        <div className="flex-1">
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${healthColor === 'green' ? 'bg-green-500' :
                                            healthColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${phoneNumber.health_score}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {phoneNumber.failed_streak > 0 && `${phoneNumber.failed_streak} שיחות רצופות ללא מענה`}
                            </p>
                        </div>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300">
                        {phoneNumber.is_quarantined ? (
                            <>
                                <strong className="text-red-600">המספר הוסר אוטומטית מהתור.</strong>
                                <br />
                                ככל הנראה סומן כספאם. מומלץ להחליף מספר או להמתין 24 שעות.
                            </>
                        ) : healthColor === 'red' ? (
                            <>
                                <strong>שים לב!</strong> אחוז המענה נמוך מאוד.
                                <br />
                                מומלץ להחליף מספר כדי לשמור על מוניטין.
                            </>
                        ) : (
                            <>
                                רצף שיחות ללא מענה זוהה.
                                <br />
                                שקול להחליף מספר או לקחת הפסקה קצרה.
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onSwitchNumber}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            החלף מספר
                        </button>
                        <button
                            onClick={onDismiss}
                            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            אחר כך
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Badge component for showing health in headers
interface NumberHealthBadgeProps {
    healthScore: number;
    size?: 'sm' | 'md';
    showLabel?: boolean;
}

export const NumberHealthBadge: React.FC<NumberHealthBadgeProps> = ({
    healthScore,
    size = 'sm',
    showLabel = false
}) => {
    const getColor = (score: number) => {
        if (score >= 70) return { bg: 'bg-green-100', text: 'text-green-700', fill: 'bg-green-500' };
        if (score >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-700', fill: 'bg-yellow-500' };
        return { bg: 'bg-red-100', text: 'text-red-700', fill: 'bg-red-500' };
    };

    const colors = getColor(healthScore);
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.text} ${sizeClasses} font-medium`}>
            <span className={`w-2 h-2 rounded-full ${colors.fill}`} />
            {healthScore}%
            {showLabel && <span className="opacity-70">בריאות</span>}
        </div>
    );
};
