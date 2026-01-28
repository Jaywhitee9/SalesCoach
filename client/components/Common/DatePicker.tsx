import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar, X } from 'lucide-react';
import ReactDOM from 'react-dom';

interface DatePickerProps {
    value: string; // Format: YYYY-MM-DD
    onChange: (date: string) => void;
    minDate?: string;
    placeholder?: string;
}

const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS_HE = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    minDate,
    placeholder = 'בחר תאריך'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        if (value) return new Date(value);
        return new Date();
    });
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, width: 0, maxHeight: 500 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Calculate dropdown position - prefer opening upward
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 380;

            // Always open upward if not enough space below
            const openUpward = spaceBelow < dropdownHeight;

            setDropdownPosition({
                top: openUpward ? Math.max(10, rect.top - dropdownHeight - 8) : rect.bottom + 8,
                right: window.innerWidth - rect.right,
                width: Math.max(rect.width, 288),
                maxHeight: openUpward ? spaceAbove - 20 : spaceBelow - 20
            });
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on scroll outside dropdown
    useEffect(() => {
        const handleScroll = (e: Event) => {
            // Don't close if scrolling inside the dropdown
            if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
                return;
            }
            if (isOpen) setIsOpen(false);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleDateSelect = (day: number) => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handlePrevMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const isDateDisabled = (day: number) => {
        if (!minDate) return false;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const dateToCheck = new Date(year, month, day);
        const minDateObj = new Date(minDate);
        minDateObj.setHours(0, 0, 0, 0);
        return dateToCheck < minDateObj;
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            viewDate.getFullYear() === today.getFullYear() &&
            viewDate.getMonth() === today.getMonth() &&
            day === today.getDate()
        );
    };

    const isSelected = (day: number) => {
        if (!value) return false;
        const selectedDate = new Date(value);
        return (
            viewDate.getFullYear() === selectedDate.getFullYear() &&
            viewDate.getMonth() === selectedDate.getMonth() &&
            day === selectedDate.getDate()
        );
    };

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    // Build calendar grid
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const dropdownContent = (
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: dropdownPosition.top,
                right: dropdownPosition.right,
                width: dropdownPosition.width,
                maxHeight: dropdownPosition.maxHeight,
                zIndex: 99999
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-auto"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <div className="text-center">
                    <span className="text-white font-bold">
                        {MONTHS_HE[month]} {year}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                {DAYS_HE.map((day, i) => (
                    <div key={i} className="text-center text-xs font-bold text-slate-500">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 p-3">
                {days.map((day, i) => (
                    <div key={i} className="aspect-square">
                        {day && (
                            <button
                                type="button"
                                onClick={() => !isDateDisabled(day) && handleDateSelect(day)}
                                disabled={isDateDisabled(day)}
                                className={`w-full h-full rounded-lg text-sm font-medium transition-all flex items-center justify-center ${isSelected(day)
                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                                    : isToday(day)
                                        ? 'bg-brand-100 text-brand-700 font-bold'
                                        : isDateDisabled(day)
                                            ? 'text-slate-300 cursor-not-allowed'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {day}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="px-3 pb-3 pt-1 flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        onChange(new Date().toISOString().split('T')[0]);
                        setIsOpen(false);
                    }}
                    className="flex-1 py-2.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                >
                    היום
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        onChange(tomorrow.toISOString().split('T')[0]);
                        setIsOpen(false);
                    }}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                    מחר
                </button>
                {value && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange('');
                            setIsOpen(false);
                        }}
                        className="px-4 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative">
            {/* Input Display */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-2 border-slate-200 rounded-xl text-right text-slate-800 font-medium cursor-pointer hover:border-brand-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-all shadow-sm flex items-center justify-between gap-2"
            >
                <Calendar className="w-4 h-4 text-brand-400" />
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>
                    {value ? formatDateDisplay(value) : placeholder}
                </span>
            </button>

            {/* Portal Dropdown */}
            {isOpen && ReactDOM.createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default DatePicker;
