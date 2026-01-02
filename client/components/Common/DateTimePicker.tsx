"use client";

import React from 'react';
import { Datepicker } from 'flowbite-react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

interface DateTimePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    label?: string;
    showTime?: boolean;
    className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
    value,
    onChange,
    minDate,
    maxDate,
    label,
    showTime = false,
    className = ''
}) => {
    const [time, setTime] = React.useState<string>('12:00');
    const [isTimeOpen, setIsTimeOpen] = React.useState(false);
    const [isDateOpen, setIsDateOpen] = React.useState(false);

    // Close dropdowns on scroll anywhere in the document
    React.useEffect(() => {
        // Removed scroll listener to allow scrolling within the modal/dropdown
        // without closing the picker immediately.
        const handleScroll = () => {
            // Optional: only close if scrolling outside? 
            // For now, disabling this is the fix for the reported issue.
        };

        // window.addEventListener('scroll', handleScroll, true);
        // return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isDateOpen, isTimeOpen]);

    // Keep time in sync when value changes externally
    React.useEffect(() => {
        if (value) {
            const hours = value.getHours().toString().padStart(2, '0');
            const mins = value.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${mins}`);
        }
    }, [value]);

    const handleDateChange = (date: Date | null) => {
        if (date) {
            if (showTime) {
                const [hours, mins] = time.split(':').map(Number);
                date.setHours(hours, mins, 0, 0);
            }
            onChange(date);
            setIsDateOpen(false); // Close after selection
        }
    };

    // Time options for dropdown
    const timeOptions = React.useMemo(() => {
        const options: string[] = [];

        let minTime = 0; // in minutes

        // If selected date is today (same as minDate), filter past times
        if (value && minDate &&
            value.getFullYear() === minDate.getFullYear() &&
            value.getMonth() === minDate.getMonth() &&
            value.getDate() === minDate.getDate()) {

            minTime = minDate.getHours() * 60 + minDate.getMinutes();
        }

        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const currentTime = h * 60 + m;
                if (currentTime >= minTime) {
                    options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
            }
        }
        return options;
    }, [value, minDate]);

    // Format date for display
    const formatDate = (date: Date | null): string => {
        if (!date) return 'בחר תאריך';
        return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Custom theme for Flowbite Datepicker - styling the inline calendar
    const customTheme = {
        root: {
            base: "relative w-full"
        },
        popup: {
            root: {
                base: "block",
                inline: "relative top-0 z-auto",
                inner: "inline-block rounded-xl bg-white p-4 shadow-xl dark:bg-slate-800 w-full max-w-[320px] mx-auto"
            },
            header: {
                base: "",
                title: "px-2 py-2 text-center font-bold text-lg text-slate-900 dark:text-white mb-2",
                selectors: {
                    base: "mb-4 flex justify-between items-center rtl:flex-row-reverse",
                    button: {
                        base: "rounded-lg bg-white dark:bg-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm",
                        prev: "rotate-0",
                        next: "rotate-0",
                        view: ""
                    }
                }
            },
            view: {
                base: "p-1"
            },
            footer: {
                base: "mt-4 flex gap-2 rtl:flex-row-reverse",
                button: {
                    base: "flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors shadow-sm",
                    today: "bg-brand-600 text-white hover:bg-brand-700",
                    clear: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                }
            }
        },
        views: {
            days: {
                header: {
                    base: "mb-2 grid grid-cols-7 rtl:flex-row-reverse",
                    title: "h-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center"
                },
                items: {
                    base: "grid grid-cols-7 gap-1",
                    item: {
                        base: "flex items-center justify-center w-full aspect-square rounded-full border-0 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors",
                        selected: "bg-brand-600 text-white hover:bg-brand-600 shadow-md",
                        disabled: "text-slate-300 dark:text-slate-600 cursor-not-allowed hover:bg-transparent"
                    }
                }
            },
            months: {
                items: {
                    base: "grid grid-cols-4 gap-2",
                    item: {
                        base: "flex items-center justify-center w-full h-12 cursor-pointer rounded-lg border-0 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors",
                        selected: "bg-brand-600 text-white hover:bg-brand-600",
                        disabled: "text-slate-300 dark:text-slate-600"
                    }
                }
            },
            years: {
                items: {
                    base: "grid grid-cols-4 gap-2",
                    item: {
                        base: "flex items-center justify-center w-full h-12 cursor-pointer rounded-lg border-0 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors",
                        selected: "bg-brand-600 text-white hover:bg-brand-600",
                        disabled: "text-slate-300 dark:text-slate-600"
                    }
                }
            },
            decades: {
                items: {
                    base: "grid grid-cols-4 gap-2",
                    item: {
                        base: "flex items-center justify-center w-full h-12 cursor-pointer rounded-lg border-0 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors",
                        selected: "bg-brand-600 text-white hover:bg-brand-600",
                        disabled: "text-slate-300 dark:text-slate-600"
                    }
                }
            }
        }
    };

    // Common input style for both date and time (identical)
    const inputStyle = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white flex items-center gap-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors cursor-pointer shadow-sm";

    return (
        <div className={`flex flex-col gap-2 ${className}`} dir="rtl">
            {label && (
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500" />
                    {label}
                </label>
            )}
            <div className="flex flex-col sm:flex-row gap-3 relative">
                {/* Time Picker */}
                {showTime && (
                    <div className="relative w-full sm:w-[130px] shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsTimeOpen(!isTimeOpen)}
                            className={inputStyle}
                        >
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-medium flex-1 text-center">{time}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Time Dropdown */}
                        {isTimeOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsTimeOpen(false)}
                                />
                                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto w-full">
                                    {timeOptions.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                                setTime(t);
                                                setIsTimeOpen(false);
                                                if (value) {
                                                    const newDate = new Date(value);
                                                    const [hours, mins] = t.split(':').map(Number);
                                                    newDate.setHours(hours, mins, 0, 0);
                                                    onChange(newDate);
                                                }
                                            }}
                                            className={`w-full px-4 py-2.5 text-sm text-center transition-colors ${t === time
                                                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Date Picker - Custom Trigger */}
                <div className="relative flex-1 min-w-0 w-full">
                    <button
                        type="button"
                        onClick={() => setIsDateOpen(!isDateOpen)}
                        className={inputStyle}
                    >
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium flex-1 text-center">{formatDate(value)}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Date Dropdown */}
                    {isDateOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setIsDateOpen(false)}
                                onScroll={(e) => e.stopPropagation()}
                            />
                            <div className="absolute top-full right-0 left-0 sm:left-auto sm:right-auto sm:rtl:right-0 mt-2 z-50 flex justify-center sm:block">
                                <div
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden w-full max-w-[320px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Datepicker
                                        inline
                                        value={value}
                                        onChange={handleDateChange}
                                        minDate={minDate}
                                        maxDate={maxDate}
                                        language="he-IL"
                                        labelTodayButton="היום"
                                        labelClearButton="נקה"
                                        weekStart={0}
                                        theme={customTheme}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DateTimePicker;

