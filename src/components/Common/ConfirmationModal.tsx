import React from 'react';
import { AlertTriangle, X, Trash2, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50',
          borderAccent: 'border-rose-500/30'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50',
          borderAccent: 'border-amber-500/30'
        };
      default:
        return {
          iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50',
          borderAccent: 'border-emerald-500/30'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-md bg-slate-900 border ${styles.borderAccent} rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${styles.iconBg}`}>
              {variant === 'danger' ? (
                <Trash2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400 font-medium">Confirmação de Ação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description Body */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          {description}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2.5 rounded-xl ${styles.confirmBtn} text-xs font-bold shadow-lg transition-all flex items-center gap-2`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
