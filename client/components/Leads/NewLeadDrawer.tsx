import React, { useState, useEffect } from 'react';
import {
  X, User, Building2, Phone, Mail, Globe,
  Banknote, Tag, AlertCircle, Check, ChevronDown, Plus
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Lead } from '../../types';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface NewLeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Partial<Lead>) => Promise<void>;
  initialData?: Partial<Lead>;
  teamMembers?: TeamMember[];
}

export const NewLeadDrawer: React.FC<NewLeadDrawerProps> = ({ isOpen, onClose, onSave, initialData, teamMembers = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    status: 'New',
    source: 'Website',
    ownerId: '',
    phone: '',
    email: '',
    website: '',
    value: '',
    tags: [] as string[],
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        company: initialData?.company || '',
        status: (initialData?.status as string) || 'New',
        source: initialData?.source || 'Website',
        ownerId: initialData?.owner?.id || (teamMembers.length > 0 ? teamMembers[0].id : ''),
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        website: (initialData as any)?.website || '',
        value: initialData?.value ? String(initialData.value).replace(/[^0-9.]/g, '') : '',
        tags: initialData?.tags || ['SaaS'],
        notes: (initialData as any)?.notes || ''
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  // Handle Input Changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Tag Management
  const addTag = () => {
    const newTag = prompt("הכנס תגית חדשה:");
    if (newTag && !formData.tags.includes(newTag)) {
      handleChange('tags', [...formData.tags, newTag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(t => t !== tagToRemove));
  };

  // Validation & Submit
  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'יש להזין שם מלא';
    if (!formData.status) newErrors.status = 'יש לבחור סטטוס';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);

    // Prepare Data
    const newLead: Partial<Lead> = {
      name: formData.name,
      company: formData.company,
      status: formData.status as Lead['status'],
      source: formData.source,
      phone: formData.phone,
      email: formData.email,
      value: formData.value ? `₪${formData.value}` : '₪0',
      tags: formData.tags,
      owner: teamMembers.find(u => u.id === formData.ownerId)
    };

    setIsSaving(true);

    try {
      await onSave(newLead);
      onClose();
    } catch (e) {
      console.error(e);
      // Keep drawer open on error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-[70] w-full md:w-[520px] bg-slate-50 dark:bg-slate-950 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-800">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {formData.name || 'ליד חדש'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">הוספת לקוח פוטנציאלי למערכת</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Card 1: Basic Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> פרטי ליד
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  שם מלא <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all ${errors.name ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-700'}`}
                  placeholder="לדוגמה: ישראל ישראלי"
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">חברה</label>
                <div className="relative">
                  <Building2 className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="שם החברה בע״מ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">סטטוס <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
                    >
                      <option value="New">ליד חדש</option>
                      <option value="Discovery">גילוי צרכים</option>
                      <option value="Negotiation">מו"מ</option>
                      <option value="Proposal">הצעת מחיר</option>
                      <option value="Closed">סגור</option>
                    </select>
                    <ChevronDown className="absolute top-3 left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">מקור</label>
                  <div className="relative">
                    <select
                      value={formData.source}
                      onChange={(e) => handleChange('source', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
                    >
                      <option value="Website">אתר אינטרנט</option>
                      <option value="LinkedIn">לינקדאין</option>
                      <option value="Facebook Ads">פייסבוק</option>
                      <option value="Referral">הפניה</option>
                      <option value="Webinar">וובינר</option>
                    </select>
                    <ChevronDown className="absolute top-3 left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אחראי (Owner)</label>
                <div className="relative">
                  <select
                    value={formData.ownerId}
                    onChange={(e) => handleChange('ownerId', e.target.value)}
                    className="w-full pr-3 pl-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
                  >
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute top-3 left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> פרטי קשר
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">טלפון נייד</label>
                <div className="relative">
                  <Phone className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all dir-ltr text-right"
                    placeholder="050-0000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אימייל</label>
                <div className="relative">
                  <Mail className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all dir-ltr text-right"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אתר אינטרנט</label>
                <div className="relative">
                  <Globe className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all dir-ltr text-right"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Business Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Banknote className="w-3.5 h-3.5" /> פרטי עסקה
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ערך עסקה משוער</label>
                <div className="relative">
                  <span className="absolute top-2 right-3 text-slate-400 text-sm">₪</span>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => handleChange('value', e.target.value)}
                    className="w-full pr-7 pl-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">תחום עסקי (תגיות)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded text-xs border border-brand-100 dark:border-brand-800">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-brand-900"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <button onClick={addTag} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded text-xs hover:bg-slate-200 transition-colors">
                    <Plus className="w-3 h-3" /> הוסף תגית
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">הערות נוספות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all h-24 resize-none"
                  placeholder="הוסף פרטים חשובים על הליד..."
                ></textarea>
              </div>
            </div>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="text-slate-500">ביטול</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="w-full md:w-auto px-8">
            {isSaving ? 'שומר...' : 'שמור ליד'}
            {!isSaving && <Check className="w-4 h-4 ml-2" />}
          </Button>
        </div>

      </div>
    </>
  );
};
