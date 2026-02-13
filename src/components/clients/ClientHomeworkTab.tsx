"use client";

import { useState } from "react";
import { useHomework, HomeworkItem } from "@/hooks/useCollections";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  MoreVertical,
  BookOpen,
  Loader2,
  X,
  Save
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmContext";
import { notifyParentHomeworkAssigned } from "@/lib/notificationService";

interface ClientHomeworkTabProps {
  client: any;
}

export default function ClientHomeworkTab({ client }: ClientHomeworkTabProps) {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error: showError } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { data: homework, loading } = useHomework(client.id);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    frequency: "daily" as any
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      const homeworkRef = collection(db, "clients", client.id, "homework");
      await addDoc(homeworkRef, {
        ...formData,
        assignedBy: user.uid,
        completed: false,
        parentNotes: "",
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp()
      });
      
      success(t('clients.homework.save_success'));
      setIsAdding(false);

      // Trigger notification for parents
      if (user) {
        notifyParentHomeworkAssigned(client.id, {
          homeworkTitle: formData.title,
          therapistName: userData?.name || t('common.unknown'),
          triggeredByUserId: user.uid
        });
      }

      setFormData({
        title: "",
        description: "",
        dueDate: "",
        frequency: "daily"
      });
    } catch (err) {
      console.error(err);
      showError(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    customConfirm({
      title: t('common.delete'),
      message: t('clients.homework.delete_confirm'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "clients", client.id, "homework", id));
          success(t('common.success'));
        } catch (err) {
          showError(t('common.error'));
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t('clients.homework.title')}
          </h3>
          <p className="text-sm text-neutral-500">
            {t('clients.homework.subtitle')}
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            {t('clients.homework.add_button')}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                {t('clients.homework.add_button')}
              </h4>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                  {t('clients.homework.form.title')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('clients.homework.form.placeholder_title')}
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                  {t('clients.homework.form.description')}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('clients.homework.form.placeholder_desc')}
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                    {t('clients.homework.form.frequency')}
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  >
                    <option value="daily">{t('parent_portal.homework.frequency.daily')}</option>
                    <option value="weekly">{t('parent_portal.homework.frequency.weekly')}</option>
                    <option value="3x_week">{t('parent_portal.homework.frequency.3x_week')}</option>
                    <option value="as_needed">{t('parent_portal.homework.frequency.as_needed')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                    {t('clients.homework.form.due_date')}
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {homework.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
            <BookOpen className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium">{t('clients.homework.no_homework')}</p>
          </div>
        ) : (
          homework.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-neutral-900 dark:text-white">
                      {item.title}
                    </h4>
                    <span className={clsx(
                      "px-2 py-0.5 text-[10px] font-bold uppercase rounded-full",
                      item.completed 
                        ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                        : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                    )}>
                      {item.completed ? t('clients.homework.status.completed') : t('clients.homework.status.in_progress')}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                    {item.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t(`parent_portal.homework.frequency.${item.frequency}`)}</span>
                    </div>
                    {item.dueDate && (
                      <div className="flex items-center gap-1.5 text-error-600 dark:text-error-400">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="font-medium">{new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {item.parentNotes && (
                    <div className="mt-4 p-3 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/20">
                      <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase mb-1 tracking-wider">
                        {t('parent_portal.homework.notes')}
                      </p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
                        &quot;{item.parentNotes}&quot;
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-neutral-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
