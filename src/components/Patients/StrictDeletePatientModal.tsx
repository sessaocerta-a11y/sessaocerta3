import React, { useState } from 'react';
import { Patient } from '../../types';
import { AlertTriangle, Trash2, X, ShieldAlert, Archive } from 'lucide-react';

interface StrictDeletePatientModalProps {
  patient: Patient | null;
  onClose: () => void;
  onConfirmDelete: (patientId: string) => void;
  onArchivePatient?: (patientId: string) => void;
}

export const StrictDeletePatientModal: React.FC<StrictDeletePatientModalProps> = ({
  patient,
  onClose,
  onConfirmDelete,
  onArchivePatient
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');

  if (!patient) return null;

  const requiredText = `EXCLUIR ${patient.name.trim().toUpperCase()}`;
  const isValid = typedConfirmation.trim() === requiredText;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onConfirmDelete(patient.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 space-y-0">
        {/* Header */}
        <div className="p-6 bg-rose-950/40 border-b border-rose-500/30 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Exclusão Permanente
              </h2>
              <p className="text-xs text-rose-300/90 font-medium">
                Ação destrutiva irreversível
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 space-y-2">
            <p className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Você está prestes a apagar: {patient.name}</span>
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação removerá <strong>definitivamente</strong> e sem possibilidade de recuperação:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
              <li>Cadastro do paciente e contatos de emergência</li>
              <li>Prontuário completo e evoluções clínicas registradas</li>
              <li>Histórico de consultas e agendamentos</li>
              <li>Registros e lançamentos financeiros</li>
              <li>Histórico de alterações e auditoria</li>
            </ul>
          </div>

          {/* Alternative Suggestion: Archiving */}
          {onArchivePatient && patient.status !== 'arquivado' && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5" /> Opção Recomendada: Arquivar
                </span>
                <p className="text-[11px] text-slate-400">
                  Arquivar oculta o paciente da lista sem perder prontuários ou financeiro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onArchivePatient(patient.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                Arquivar Paciente
              </button>
            </div>
          )}

          {/* Type Confirmation Input */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-200">
              Para confirmar a exclusão, digite exatamente no campo abaixo:
            </label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-xs text-rose-400 font-bold tracking-wide select-all">
              {requiredText}
            </div>

            <input
              type="text"
              required
              autoFocus
              placeholder={`Digite: ${requiredText}`}
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer text-xs"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isValid}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg ${
                isValid
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-rose-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50 opacity-60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Permanentemente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
