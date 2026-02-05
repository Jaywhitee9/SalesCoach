import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react';
import ReactDOM from 'react-dom';

interface TimePickerProps {
    value: string; // Format: HH:MM
    onChange: (time: string) => void;
    placeholder?: string;
}

const QUICK_TIMES = [
    { label: 'בוקר', times: ['08:00', '09:00', '10:00', '11:00'] },
    { label: 'צהריים', times: ['12:00', '13:00', '14:00'] },
    { label: 'אחה״צ', times: ['15:00', '16:00', '17:00'] },
    { label: 'ערב', times: ['18:00', '19:00', '20:00', '21:00'] },
];

export const TimePicker: React.FC<TimePickerProps> = ({
    value,
    onChange,
    placeholder = 'בחר שעה'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, width: 0, maxHeight: 500 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [hours, minutes] = value ? value.split(':').map(Number) : [10, 0];

    // Calculate dropdown position - prefer opening upward
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 420;

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

    const formatTime = (h: number, m: number) => {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const incrementHours = () => {
        const newH = (hours + 1) % 24;
        onChange(formatTime(newH, minutes));
    };

    const decrementHours = () => {
        const newH = (hours - 1 + 24) % 24;
        onChange(formatTime(newH, minutes));
    };

    const incrementMinutes = () => {
        const newM = (minutes + 15) % 60;
        onChange(formatTime(hours, newM));
    };

    const decrementMinutes = () => {
        const newM = (minutes - 15 + 60) % 60;
        onChange(formatTime(hours, newM));
    };

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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                <span className="text-white font-bold">בחר שעה</span>
            </div>

            {/* Time Spinner */}
            <div className="p-4 flex justify-center gap-4 border-b border-slate-100">
                {/* Hours */}
                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={incrementHours}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronUp className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="w-16 h-14 bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-200 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-indigo-600">
                            {String(hours).padStart(2, '0')}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={decrementHours}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                    </button>
                    <span className="text-[10px] text-slate-400 mt-1">שעות</span>
                </div>

                <div className="flex items-center">
                    <span className="text-2xl font-bold text-slate-300">:</span>
                </div>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={incrementMinutes}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronUp className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="w-16 h-14 bg-gradient-to-b from-purple-50 to-white border-2 border-purple-200 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-600">
                            {String(minutes).padStart(2, '0')}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={decrementMinutes}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                    </button>
                    <span className="text-[10px] text-slate-400 mt-1">דקות</span>
                </div>
            </div>

            {/* Quick Times */}
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
                {QUICK_TIMES.map((group) => (
                    <div key={group.label}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {group.label}
                        </span>
                        <div className="flex gap-1.5 mt-1">
                            {group.times.map((time) => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => {
                                        onChange(time);
                                        setIsOpen(false);
                                    }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${value === time
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm Button */}
            <div className="px-3 pb-3">
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                    <Check className="w-4 h-4" />
                    אישור
                </button>
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
                className="w-full px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-2 border-slate-200 rounded-xl text-right text-slate-800 font-medium cursor-pointer hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all shadow-sm flex items-center justify-between gap-2"
            >
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className={value ? 'text-slate-800 font-bold text-lg' : 'text-slate-400'}>
                    {value || placeholder}
                </span>
            </button>

            {/* Portal Dropdown */}
            {isOpen && ReactDOM.createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default TimePicker;
