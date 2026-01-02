import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Download } from 'lucide-react';
import { Button } from '../Common/Button';
import { Lead } from '../../types';

interface CSVImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (leads: Partial<Lead>[]) => Promise<void>;
    teamMembers: { id: string; name: string }[];
}

// Expected CSV columns
const EXPECTED_COLUMNS = ['name', 'company', 'phone', 'email', 'status', 'source', 'value'];
const COLUMN_LABELS: Record<string, string> = {
    name: 'שם מלא',
    company: 'חברה',
    phone: 'טלפון',
    email: 'אימייל',
    status: 'סטטוס',
    source: 'מקור',
    value: 'ערך עסקה'
};

// Valid status and source values
const VALID_STATUSES = ['New', 'Discovery', 'Negotiation', 'Proposal', 'Closed'];
const VALID_SOURCES = ['Website', 'LinkedIn', 'Facebook Ads', 'Referral', 'Webinar'];

// Hebrew to English mappings
const STATUS_MAP: Record<string, string> = {
    'ליד חדש': 'New',
    'חדש': 'New',
    'new': 'New',
    'גילוי צרכים': 'Discovery',
    'discovery': 'Discovery',
    'משא ומתן': 'Negotiation',
    'negotiation': 'Negotiation',
    'הצעת מחיר': 'Proposal',
    'proposal': 'Proposal',
    'סגור': 'Closed',
    'closed': 'Closed'
};

const SOURCE_MAP: Record<string, string> = {
    'אתר אינטרנט': 'Website',
    'אתר': 'Website',
    'website': 'Website',
    'לינקדאין': 'LinkedIn',
    'linkedin': 'LinkedIn',
    'פייסבוק': 'Facebook Ads',
    'facebook ads': 'Facebook Ads',
    'facebook': 'Facebook Ads',
    'הפניה': 'Referral',
    'referral': 'Referral',
    'וובינר': 'Webinar',
    'webinar': 'Webinar'
};

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onImport, teamMembers }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<Partial<Lead>[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                setErrors(['הקובץ ריק או לא מכיל נתונים']);
                return;
            }

            // Parse header (first line)
            const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

            // Map Hebrew headers to English
            const headerMap: Record<string, string> = {
                'שם': 'name',
                'שם מלא': 'name',
                'חברה': 'company',
                'טלפון': 'phone',
                'אימייל': 'email',
                'סטטוס': 'status',
                'מקור': 'source',
                'ערך': 'value',
                'ערך עסקה': 'value'
            };

            const normalizedHeader = header.map(h => headerMap[h] || h);

            // Check for required 'name' column
            if (!normalizedHeader.includes('name')) {
                setErrors(['חסרה עמודת "שם" בקובץ. נא להוסיף עמודה עם שם הליד.']);
                return;
            }

            const leads: Partial<Lead>[] = [];
            const parseErrors: string[] = [];

            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length === 0) continue;

                const lead: Partial<Lead> = {};

                normalizedHeader.forEach((col, idx) => {
                    const value = values[idx]?.trim().replace(/^["']|["']$/g, '') || '';

                    switch (col) {
                        case 'name':
                            lead.name = value;
                            break;
                        case 'company':
                            lead.company = value;
                            break;
                        case 'phone':
                            lead.phone = value;
                            break;
                        case 'email':
                            lead.email = value;
                            break;
                        case 'status':
                            // Map Hebrew/English status to valid value
                            const mappedStatus = STATUS_MAP[value.toLowerCase()] || value;
                            lead.status = (VALID_STATUSES.includes(mappedStatus) ? mappedStatus : 'New') as Lead['status'];
                            break;
                        case 'source':
                            // Map Hebrew/English source to valid value
                            const mappedSource = SOURCE_MAP[value.toLowerCase()] || value;
                            lead.source = VALID_SOURCES.includes(mappedSource) ? mappedSource : 'Website';
                            break;
                        case 'value':
                            lead.value = value.replace(/[^\d.]/g, '') ? `₪${value.replace(/[^\d.]/g, '')}` : '₪0';
                            break;
                    }
                });

                // Validate required fields
                if (!lead.name) {
                    parseErrors.push(`שורה ${i + 1}: חסר שם`);
                    continue;
                }

                // Set defaults
                if (!lead.status) lead.status = 'New';
                if (!lead.source) lead.source = 'Website';

                leads.push(lead);
            }

            if (leads.length === 0) {
                setErrors(['לא נמצאו לידים תקינים בקובץ']);
                return;
            }

            setErrors(parseErrors);
            setParsedData(leads);
            setStep('preview');
        };

        reader.readAsText(file);
    };

    // Helper to parse CSV line (handles quoted values with commas)
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            await onImport(parsedData);
            setStep('success');
        } catch (error) {
            setErrors(['שגיאה בייבוא הלידים. נסה שוב.']);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setStep('upload');
        onClose();
    };

    const downloadTemplate = () => {
        const csvContent = 'שם,חברה,טלפון,אימייל,סטטוס,מקור,ערך עסקה\nישראל ישראלי,חברה בע"מ,050-1234567,email@example.com,ליד חדש,אתר אינטרנט,5000\n';
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'leads_template.csv';
        link.click();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]" onClick={handleClose} />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">ייבוא לידים מקובץ CSV</h2>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors"
                            >
                                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">לחץ כאן או גרור קובץ CSV</p>
                                <p className="text-xs text-slate-400 mt-1">עד 1000 לידים בקובץ אחד</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* Template Download */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">מבנה הקובץ הנדרש:</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                    הקובץ צריך לכלול כותרות בשורה הראשונה. העמודות הנתמכות:
                                </p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                                        <span key={key} className="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                                            {label}
                                        </span>
                                    ))}
                                </div>
                                <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                                    <Download className="w-3.5 h-3.5 ml-1" />
                                    הורד קובץ לדוגמה
                                </Button>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm font-bold">שגיאה</span>
                                    </div>
                                    {errors.map((err, i) => (
                                        <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{err}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                                <FileText className="w-5 h-5 text-brand-600" />
                                <div>
                                    <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{file?.name}</p>
                                    <p className="text-xs text-brand-600 dark:text-brand-400">{parsedData.length} לידים נמצאו</p>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="max-h-60 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                <table className="w-full text-xs text-right">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 font-medium text-slate-600">שם</th>
                                            <th className="px-3 py-2 font-medium text-slate-600">טלפון</th>
                                            <th className="px-3 py-2 font-medium text-slate-600">סטטוס</th>
                                            <th className="px-3 py-2 font-medium text-slate-600">מקור</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData.slice(0, 10).map((lead, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-3 py-2 text-slate-900 dark:text-white">{lead.name}</td>
                                                <td className="px-3 py-2 text-slate-500">{lead.phone || '-'}</td>
                                                <td className="px-3 py-2 text-slate-500">{lead.status}</td>
                                                <td className="px-3 py-2 text-slate-500">{lead.source}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 10 && (
                                    <p className="text-xs text-slate-400 text-center py-2">ועוד {parsedData.length - 10} לידים נוספים...</p>
                                )}
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">אזהרות ({errors.length}):</p>
                                    {errors.slice(0, 3).map((err, i) => (
                                        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{err}</p>
                                    ))}
                                    {errors.length > 3 && <p className="text-xs text-amber-500">ועוד {errors.length - 3}...</p>}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" onClick={() => { setStep('upload'); setFile(null); setParsedData([]); setErrors([]); }}>חזור</Button>
                                <Button onClick={handleImport} disabled={isImporting}>
                                    {isImporting ? 'מייבא...' : `ייבא ${parsedData.length} לידים`}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">הייבוא הושלם בהצלחה!</h3>
                            <p className="text-sm text-slate-500 mb-6">{parsedData.length} לידים נוספו למערכת</p>
                            <Button onClick={handleClose}>סגור</Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
