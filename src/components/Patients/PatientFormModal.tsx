import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Patient, PatientStatus, AttendanceType } from '../../types';
import { X, User, Phone, Mail, FileText, HeartHandshake, ShieldCheck } from 'lucide-react';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  patientToEdit
}) => {
  const { addPatient, updatePatient, profile } = useApp();

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [status, setStatus] = useState<PatientStatus>('ativo');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('online');
  const [sessionPrice, setSessionPrice] = useState<number>(profile.sessionDefaultPrice);
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [initialAnamnesis, setInitialAnamnesis] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (patientToEdit) {
      setName(patientToEdit.name);
      setCpf(patientToEdit.cpf);
      setBirthDate(patientToEdit.birthDate || '');
      setPhone(patientToEdit.phone);
      setEmail(patientToEdit.email || '');
      setEmergencyContactName(patientToEdit.emergencyContactName);
      setEmergencyContactPhone(patientToEdit.emergencyContactPhone);
      setStatus(patientToEdit.status);
      setAttendanceType(patientToEdit.attendanceType);
      setSessionPrice(patientToEdit.sessionPrice);
      setPreferredSchedule(patientToEdit.preferredSchedule || '');
      setInitialAnamnesis(patientToEdit.initialAnamnesis || '');
    } else {
      setName('');
      setCpf('');
      setBirthDate('');
      setPhone('');
      setEmail('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setStatus('ativo');
      setAttendanceType('online');
      setSessionPrice(profile.sessionDefaultPrice);
      setPreferredSchedule('');
      setInitialAnamnesis('');
    }
  }, [isOpen, patientToEdit, profile.sessionDefaultPrice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      alert('Por favor, preencha o Nome, Telefone e o Contato de Emergência obrigatoriamente.');
      return;
    }

    if (patientToEdit) {
      updatePatient(patientToEdit.id, {
        name,
        cpf,
        birthDate,
        phone,
        email,
        emergencyContactName,
        emergencyContactPhone,
        status,
        attendanceType,
        sessionPrice: Number(sessionPrice),
        preferredSchedule,
        initialAnamnesis,
      });
    } else {
      addPatient({
        name,
        cpf,
        birthDate,
        phone,
        email,
        emergencyContactName,
        emergencyContactPhone,
        status,
        attendanceType,
        sessionPrice: Number(sessionPrice),
        preferredSchedule,
        initialAnamnesis,
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {patientToEdit ? 'Editar Dados do Paciente' : 'Cadastrar Novo Paciente'}
            </h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-200 flex-1">
          {/* Identificação principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300">
                Nome Completo do Paciente *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Beatriz Silva Alencar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">CPF</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Data de Nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Contato & Emergência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="11999998888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">E-mail</label>
              <input
                type="email"
                placeholder="paciente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-emerald-400 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Nome do Contato de Emergência *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Maria Alencar (Mãe)"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-emerald-400">
                Telefone de Emergência *
              </label>
              <input
                type="text"
                required
                placeholder="11988887777"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Modalidades & Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PatientStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ativo">Ativo em Terapia</option>
                <option value="pausa">Em Pausa</option>
                <option value="alta">Com Alta Terapêutica</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Modalidade</label>
              <select
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="online">Online (Videochamada)</option>
                <option value="presencial">Presencial (Consultório)</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Valor Acordado (R$)</label>
              <input
                type="number"
                min="0"
                value={sessionPrice}
                onChange={(e) => setSessionPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
              />
            </div>
          </div>

          {/* Anamnese */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Anotações de Anamnese Inicial & Queixa Principal</span>
              <span className="text-[10px] text-emerald-400 font-mono">Prontuário Sigiloso CFP</span>
            </label>
            <textarea
              rows={3}
              placeholder="Descreva a queixa principal trazida no primeiro contato..."
              value={initialAnamnesis}
              onChange={(e) => setInitialAnamnesis(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between rounded-xl">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
            >
              {patientToEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
