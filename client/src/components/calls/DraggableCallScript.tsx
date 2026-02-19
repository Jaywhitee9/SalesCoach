import React, { useState, useRef, useEffect } from 'react';
import {
    FileText,
    X,
    Minimize2,
    Maximize2,
    GripVertical,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    HelpCircle,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';

interface ScriptSection {
    id: string;
    title: string;
    content: string;
    icon: 'intro' | 'questions' | 'objections' | 'close';
}

interface DraggableCallScriptProps {
    isVisible: boolean;
    onClose: () => void;
    campaignName?: string;
    leadName?: string;
    customScript?: ScriptSection[];
}

// Default script sections
const defaultScript: ScriptSection[] = [
    {
        id: 'intro',
        title: 'פתיחה',
        icon: 'intro',
        content: `שלום, אני [שם] מ-[חברה].
      
אני מתקשר בהמשך לפנייה שלך לגבי [נושא].

יש לך רגע לדבר?`
    },
    {
        id: 'questions',
        title: 'שאלות מפתח',
        icon: 'questions',
        content: `• מה הסיטואציה הנוכחית שלכם?
• מה האתגרים העיקריים שאתם מתמודדים איתם?
• מתי אתם מתכננים לקבל החלטה?
• מי עוד מעורב בתהליך הקנייה?
• מה התקציב שהגדרתם?`
    },
    {
        id: 'objections',
        title: 'התנגדויות',
        icon: 'objections',
        content: `"יקר לי" → "אני מבין. אם אני מציג לך ROI של X חודשים?"

"צריך לחשוב" → "בטח. מה בדיוק צריך לבדוק?"

"יש לי ספק" → "זה לגמרי לגיטימי. מה יגרום לך להרגיש בטוח?"

"כבר עובד עם מישהו" → "מעולה! ומה הייתם רוצים לשפר?"`
    },
    {
        id: 'close',
        title: 'סגירה',
        icon: 'close',
        content: `• לסכם את הנקודות העיקריות
• להציג הצעה ברורה
• לבקש התחייבות

"אז נסכם - אנחנו מדברים על [פתרון] שיעזור לכם ב-[תועלת]. נתחיל?"`
    }
];

const getIconByType = (type: string) => {
    switch (type) {
        case 'intro': return <MessageSquare className="w-4 h-4" />;
        case 'questions': return <HelpCircle className="w-4 h-4" />;
        case 'objections': return <AlertTriangle className="w-4 h-4" />;
        case 'close': return <CheckCircle2 className="w-4 h-4" />;
        default: return <FileText className="w-4 h-4" />;
    }
};

export const DraggableCallScript: React.FC<DraggableCallScriptProps> = ({
    isVisible,
    onClose,
    campaignName,
    leadName,
    customScript
}) => {
    const script = customScript || defaultScript;

    // Position state - persist to localStorage
    const [position, setPosition] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('callScriptPosition');
            if (saved) {
                try { return JSON.parse(saved); } catch { }
            }
        }
        return { x: 100, y: 100 };
    });

    const [isMinimized, setIsMinimized] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('intro');
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Save position to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('callScriptPosition', JSON.stringify(position));
    }, [position]);

    // Handle drag start
    const handleDragStart = (e: React.MouseEvent) => {
        if (!containerRef.current) return;

        setIsDragging(true);
        const rect = containerRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        e.preventDefault();
    };

    // Handle drag move
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;

            // Keep within viewport bounds
            const maxX = window.innerWidth - (isMinimized ? 200 : 380);
            const maxY = window.innerHeight - 60;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isMinimized]);

    if (!isVisible) return null;

    return (
        <div
            ref={containerRef}
            className={`fixed z-[200] transition-all duration-200 ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
                left: position.x,
                top: position.y,
                width: isMinimized ? '200px' : '360px'
            }}
        >
            <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ${isDragging ? 'ring-2 ring-brand-500' : ''}`}>
                {/* Header - Draggable Area */}
                <div
                    className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleDragStart}
                >
                    <GripVertical className="w-4 h-4 opacity-60" />
                    <FileText className="w-4 h-4" />
                    <span className="font-bold text-sm flex-1">
                        {isMinimized ? 'סקריפט' : 'תסריט שיחה'}
                    </span>

                    {/* Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            title={isMinimized ? 'הרחב' : 'מזער'}
                        >
                            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            title="סגור"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content - Only show when not minimized */}
                {!isMinimized && (
                    <div className="max-h-[60vh] overflow-y-auto">
                        {/* Campaign/Lead Info */}
                        {(campaignName || leadName) && (
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex gap-4">
                                {campaignName && <span>קמפיין: <strong className="text-slate-700">{campaignName}</strong></span>}
                                {leadName && <span>ליד: <strong className="text-slate-700">{leadName}</strong></span>}
                            </div>
                        )}

                        {/* Script Sections */}
                        <div className="divide-y divide-slate-100">
                            {script.map((section) => (
                                <div key={section.id}>
                                    {/* Section Header */}
                                    <button
                                        onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-slate-50 transition-colors
                                 ${expandedSection === section.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'}`}
                                    >
                                        <span className={`p-1.5 rounded-lg ${expandedSection === section.id ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {getIconByType(section.icon)}
                                        </span>
                                        <span className="font-medium text-sm flex-1">{section.title}</span>
                                        {expandedSection === section.id ? (
                                            <ChevronUp className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>

                                    {/* Section Content */}
                                    {expandedSection === section.id && (
                                        <div className="px-4 py-3 bg-slate-50 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                            {section.content}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Minimized Pill - Show when minimized */}
            {isMinimized && (
                <div className="mt-2 text-center">
                    <span className="text-xs text-slate-500 bg-white/80 px-2 py-1 rounded-full shadow-sm">
                        גרור להזיז
                    </span>
                </div>
            )}
        </div>
    );
};
