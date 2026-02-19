import React, { useState } from 'react';
import {
    MessageCircle,
    FileText,
    CreditCard,
    Send,
    Check,
    Loader2,
    ExternalLink,
    X,
    Sparkles
} from 'lucide-react';

interface QuickActionsBarProps {
    leadPhone?: string;
    leadName?: string;
    leadEmail?: string;
    onSendSummary?: () => void;
    className?: string;
    callTranscript?: string; // Full conversation text for AI analysis
    callSummary?: any; // AI-generated summary from the call
}

interface ActionStatus {
    whatsapp: 'idle' | 'loading' | 'success' | 'error';
    quote: 'idle' | 'loading' | 'success' | 'error';
    payment: 'idle' | 'loading' | 'success' | 'error';
    summary: 'idle' | 'loading' | 'success' | 'error';
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
    leadPhone,
    leadName,
    leadEmail,
    onSendSummary,
    className = '',
    callTranscript,
    callSummary
}) => {
    const [actionStatus, setActionStatus] = useState<ActionStatus>({
        whatsapp: 'idle',
        quote: 'idle',
        payment: 'idle',
        summary: 'idle'
    });

    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState('');
    const [quoteDescription, setQuoteDescription] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [isGeneratingAIQuote, setIsGeneratingAIQuote] = useState(false);

    // Format phone for WhatsApp (remove spaces, add country code if needed)
    const formatPhoneForWhatsApp = (phone: string): string => {
        let cleaned = phone.replace(/[\s\-\(\)]/g, '');
        // If starts with 0, assume Israeli number
        if (cleaned.startsWith('0')) {
            cleaned = '972' + cleaned.substring(1);
        }
        // Remove + if present
        cleaned = cleaned.replace('+', '');
        return cleaned;
    };

    // Generate AI-powered quote based on call transcript
    const generateAIQuote = async () => {
        if (!callTranscript && !callSummary) {
            // No conversation data - use smart defaults
            setQuoteDescription('שירות מותאם אישית');
            setQuoteAmount('1990');
            return;
        }

        setIsGeneratingAIQuote(true);

        try {
            const response = await fetch('/api/ai/generate-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: callTranscript,
                    summary: callSummary,
                    leadName
                })
            });

            if (response.ok) {
                const data = await response.json();
                setQuoteDescription(data.description || 'שירות מותאם אישית');
                setQuoteAmount(data.amount?.toString() || '1990');
            } else {
                // Fallback to smart defaults
                setQuoteDescription('חבילה מותאמת אישית');
                setQuoteAmount('1990');
            }
        } catch (error) {
            console.error('Failed to generate AI quote:', error);
            // Fallback
            setQuoteDescription('שירות מותאם אישית');
            setQuoteAmount('1990');
        } finally {
            setIsGeneratingAIQuote(false);
        }
    };

    // Open WhatsApp with pre-filled message
    const handleWhatsApp = () => {
        if (!leadPhone) return;

        setActionStatus(prev => ({ ...prev, whatsapp: 'loading' }));

        const formattedPhone = formatPhoneForWhatsApp(leadPhone);
        const message = encodeURIComponent(`שלום ${leadName || ''}, תודה על השיחה! אשמח לעזור לך בכל שאלה.`);
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
            setActionStatus(prev => ({ ...prev, whatsapp: 'success' }));
            setTimeout(() => {
                setActionStatus(prev => ({ ...prev, whatsapp: 'idle' }));
            }, 2000);
        }, 500);
    };

    // Send quote via WhatsApp
    const handleSendQuote = () => {
        if (!leadPhone || !quoteAmount) return;

        setActionStatus(prev => ({ ...prev, quote: 'loading' }));

        const formattedPhone = formatPhoneForWhatsApp(leadPhone);
        const message = encodeURIComponent(
            `שלום ${leadName || ''},\n\n` +
            `הצעת מחיר:\n` +
            `${quoteDescription || 'שירות'}\n` +
            `סה"כ: ₪${quoteAmount}\n\n` +
            `אשמח לשמוע ממך!`
        );
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
            setActionStatus(prev => ({ ...prev, quote: 'success' }));
            setShowQuoteModal(false);
            setQuoteAmount('');
            setQuoteDescription('');
            setTimeout(() => {
                setActionStatus(prev => ({ ...prev, quote: 'idle' }));
            }, 2000);
        }, 500);
    };

    // Send payment link via WhatsApp
    const handleSendPaymentLink = () => {
        if (!leadPhone || !paymentAmount) return;

        setActionStatus(prev => ({ ...prev, payment: 'loading' }));

        const formattedPhone = formatPhoneForWhatsApp(leadPhone);
        // Placeholder payment link - in production, generate real link
        const paymentLink = `https://pay.example.com/${Date.now()}`;
        const message = encodeURIComponent(
            `שלום ${leadName || ''},\n\n` +
            `לינק לתשלום:\n` +
            `${paymentDescription || 'תשלום'} - ₪${paymentAmount}\n\n` +
            `${paymentLink}\n\n` +
            `תודה!`
        );
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
            setActionStatus(prev => ({ ...prev, payment: 'success' }));
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentDescription('');
            setTimeout(() => {
                setActionStatus(prev => ({ ...prev, payment: 'idle' }));
            }, 2000);
        }, 500);
    };

    // Send call summary
    const handleSendSummary = () => {
        setActionStatus(prev => ({ ...prev, summary: 'loading' }));

        if (onSendSummary) {
            onSendSummary();
        }

        setTimeout(() => {
            setActionStatus(prev => ({ ...prev, summary: 'success' }));
            setTimeout(() => {
                setActionStatus(prev => ({ ...prev, summary: 'idle' }));
            }, 2000);
        }, 1000);
    };

    const getButtonIcon = (status: string, defaultIcon: React.ReactNode) => {
        switch (status) {
            case 'loading': return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'success': return <Check className="w-4 h-4" />;
            default: return defaultIcon;
        }
    };

    const getButtonClass = (status: string) => {
        switch (status) {
            case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-600';
            case 'loading': return 'bg-slate-100 border-slate-200 text-slate-400 cursor-wait';
            default: return 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300';
        }
    };

    return (
        <>
            <div className={`flex items-center gap-2 ${className}`}>
                {/* WhatsApp */}
                <button
                    onClick={handleWhatsApp}
                    disabled={!leadPhone || actionStatus.whatsapp === 'loading'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${getButtonClass(actionStatus.whatsapp)}`}
                    title="שלח הודעת WhatsApp"
                >
                    {getButtonIcon(actionStatus.whatsapp, <MessageCircle className="w-4 h-4" />)}
                    <span className="hidden md:inline">WhatsApp</span>
                </button>

                {/* Quote/Proposal */}
                <button
                    onClick={() => setShowQuoteModal(true)}
                    disabled={!leadPhone || actionStatus.quote === 'loading'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${getButtonClass(actionStatus.quote)}`}
                    title="שלח הצעת מחיר"
                >
                    {getButtonIcon(actionStatus.quote, <FileText className="w-4 h-4" />)}
                    <span className="hidden md:inline">הצעה</span>
                </button>

                {/* Payment Link */}
                <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={!leadPhone || actionStatus.payment === 'loading'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${getButtonClass(actionStatus.payment)}`}
                    title="שלח לינק תשלום"
                >
                    {getButtonIcon(actionStatus.payment, <CreditCard className="w-4 h-4" />)}
                    <span className="hidden md:inline">תשלום</span>
                </button>

                {/* Send Summary */}
                <button
                    onClick={handleSendSummary}
                    disabled={actionStatus.summary === 'loading'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${getButtonClass(actionStatus.summary)}`}
                    title="שלח סיכום שיחה"
                >
                    {getButtonIcon(actionStatus.summary, <Send className="w-4 h-4" />)}
                    <span className="hidden md:inline">סיכום</span>
                </button>
            </div>

            {/* Quote Modal - ENHANCED */}
            {showQuoteModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">הצעת מחיר</h3>
                                        <p className="text-sm text-white/80">עבור {leadName || 'לקוח'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowQuoteModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* AI Quote Generation Button - Only show if we have call data */}
                            {(callTranscript || callSummary) && (
                                <button
                                    onClick={generateAIQuote}
                                    disabled={isGeneratingAIQuote}
                                    className="w-full p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-70"
                                >
                                    {isGeneratingAIQuote ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            מנתח שיחה...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            צור הצעה אוטומטית מהשיחה ✨
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Quick Preset Packages */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">בחר חבילה מהירה</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { name: 'בסיסי', price: '990' },
                                        { name: 'מתקדם', price: '1,990' },
                                        { name: 'פרימיום', price: '3,990' }
                                    ].map((pkg) => (
                                        <button
                                            key={pkg.name}
                                            onClick={() => {
                                                setQuoteDescription(`חבילת ${pkg.name}`);
                                                setQuoteAmount(pkg.price.replace(',', ''));
                                            }}
                                            className={`p-3 rounded-xl border-2 text-center transition-all ${quoteDescription === `חבילת ${pkg.name}`
                                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="text-sm font-bold">{pkg.name}</div>
                                            <div className="text-lg font-extrabold text-brand-600">₪{pkg.price}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-slate-200"></div>
                                <span className="text-xs text-slate-400 font-medium">או הזן ידנית</span>
                                <div className="flex-1 h-px bg-slate-200"></div>
                            </div>

                            {/* Manual Input */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">תיאור השירות</label>
                                    <input
                                        type="text"
                                        value={quoteDescription}
                                        onChange={(e) => setQuoteDescription(e.target.value)}
                                        placeholder="לדוגמא: ייעוץ עסקי + ליווי"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">סכום (₪)</label>
                                    <input
                                        type="number"
                                        value={quoteAmount}
                                        onChange={(e) => setQuoteAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-lg font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">תוקף ההצעה</label>
                                    <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-white">
                                        <option value="7">7 ימים</option>
                                        <option value="14">14 ימים</option>
                                        <option value="30">30 ימים</option>
                                    </select>
                                </div>
                            </div>

                            {/* Message Preview */}
                            {quoteAmount && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-slate-500 uppercase">תצוגה מקדימה</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 text-sm text-slate-700 whitespace-pre-line">
                                        שלום {leadName || '[שם הלקוח]'},

                                        הצעת מחיר:
                                        {quoteDescription || 'שירות'}
                                        סה"כ: ₪{Number(quoteAmount).toLocaleString('he-IL')}

                                        אשמח לשמוע ממך!
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                            <button
                                onClick={() => setShowQuoteModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-white font-medium transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleSendQuote}
                                disabled={!quoteAmount}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-lg shadow-emerald-500/25 transition-all"
                            >
                                <MessageCircle className="w-4 h-4" />
                                שלח ב-WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800">שליחת לינק תשלום</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור התשלום</label>
                                <input
                                    type="text"
                                    value={paymentDescription}
                                    onChange={(e) => setPaymentDescription(e.target.value)}
                                    placeholder="לדוגמא: מקדמה"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">סכום (₪)</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                                <strong>שים לב:</strong> יש להגדיר אינטגרציה עם מערכת תשלומים (Grow, iCount וכו') כדי לייצר לינקים אמיתיים.
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleSendPaymentLink}
                                disabled={!paymentAmount}
                                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-4 h-4" />
                                שלח ב-WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
