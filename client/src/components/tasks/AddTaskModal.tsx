import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Modal } from '../Common/Modal';
import { DateTimePicker } from '../Common/DateTimePicker';
import { Clock, CheckCircle2, Sparkles, ListTodo } from 'lucide-react';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (title: string, leadId: string | undefined, dueDate: Date, assigneeId?: string) => void;
    teamMembers?: { id: string; name: string; avatar: string }[];
    currentUser?: any;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd, teamMembers = [], currentUser }) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(new Date());
    const [notes, setNotes] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState<string>('');

    // Pre-select current user or first available
    React.useEffect(() => {
        if (currentUser) {
            setSelectedAssignee(currentUser.id);
        }
    }, [currentUser]);

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            const now = new Date();
            now.setHours(12, 0, 0, 0); // Default to noon
            setDueDate(now);
            setTitle('');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        if (!dueDate) {
            console.error('[AddTask] No date selected!');
            return;
        }

        console.log('[AddTask] Submitting:', {
            title: title.trim(),
            dueDate: dueDate?.toISOString(),
            rawDate: dueDate,
            isValidDate: dueDate && !isNaN(dueDate.getTime())
        });

        if (isNaN(dueDate.getTime())) {
            console.error('[AddTask] Invalid date!');
            return;
        }


        // Pass notes as part of the title for now
        const taskTitle = notes.trim() ? `${title.trim()} | ${notes.trim()}` : title.trim();
        onAdd(taskTitle, undefined, dueDate, selectedAssignee);
        setTitle('');
        setNotes('');
        onClose();
    };

    // Quick templates
    const quickTemplates = [
        'לחזור ללקוח',
        'לשלוח הצעת מחיר',
        'להתקשר לתיאום פגישה',
        'מעקב אחרי הצעה'
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="relative">
                {/* Header with icon */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/25 mb-4">
                        <ListTodo className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">משימה חדשה</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        הוסף משימה לרשימת המטלות שלך
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Date & Time with Flowbite Datepicker - MOVED TO TOP */}
                    <div>
                        <DateTimePicker
                            value={dueDate}
                            onChange={setDueDate}
                            minDate={new Date()}
                            label="תאריך ושעה"
                            showTime={true}
                        />
                    </div>


                    {/* Assign To (Manager Only) */}
                    {teamMembers.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                למי המשימה?
                            </label>
                            <select
                                value={selectedAssignee}
                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-right appearance-none"
                            >
                                <option value="" disabled>בחר נציג</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Task Title - MOVED BELOW DATE */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                            מה צריך לעשות?
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-right placeholder:text-slate-400"
                            placeholder="תאר את המשימה..."
                            autoFocus
                        />

                        {/* Quick Templates */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {quickTemplates.map((template, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTitle(template)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors border border-transparent hover:border-brand-200"
                                >
                                    {template}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            הערות (אופציונלי)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-right placeholder:text-slate-400 resize-none"
                            placeholder="מה סוכם? מחיר שניתן? פרטים נוספים..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/25 font-semibold"
                            disabled={!title.trim()}
                        >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            שמור משימה
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            type="button"
                            className="px-6 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            ביטול
                        </Button>
                    </div>
                </form>

                {/* Decorative element */}
                <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>
        </Modal>
    );
};

