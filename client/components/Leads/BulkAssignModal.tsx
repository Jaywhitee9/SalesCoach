import React, { useState } from 'react';
import { User, X, Check, Search, Users } from 'lucide-react';
import { Button } from '../Common/Button';

interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    role: string;
}

interface BulkAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (ownerId: string) => void;
    teamMembers: TeamMember[];
    selectedCount: number;
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
    isOpen,
    onClose,
    onAssign,
    teamMembers,
    selectedCount
}) => {
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredMembers = teamMembers.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAssign = () => {
        if (selectedMemberId) {
            onAssign(selectedMemberId);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-brand-600" />
                            שינוי בעלים
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            הקצאת {selectedCount} לידים נבחרים לנציג אחר
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="חפש נציג..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[400px]">
                    {filteredMembers.map(member => (
                        <button
                            key={member.id}
                            onClick={() => setSelectedMemberId(member.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${selectedMemberId === member.id
                                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800'
                                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`}
                                    alt={member.name}
                                    className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 object-cover border border-slate-200 dark:border-slate-700"
                                />
                                <div className="text-right">
                                    <p className={`font-medium text-sm ${selectedMemberId === member.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-900 dark:text-white'}`}>
                                        {member.name}
                                    </p>
                                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                                </div>
                            </div>

                            {selectedMemberId === member.id && (
                                <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </button>
                    ))}

                    {filteredMembers.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            לא נמצאו נציגים
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleAssign}
                        disabled={!selectedMemberId}
                    >
                        שמור שינויים
                    </Button>
                </div>

            </div>
        </div>
    );
};
