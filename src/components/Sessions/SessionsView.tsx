import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import {
  FileText,
  Search,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  Lock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SessionsViewProps {
  onOpenLiveSession: (session: Session) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  onOpenLiveSession
}) => {
  const {
    sessions,
    hideConfidentialData,
    toggleHideConfidentialData,
    startLiveSession
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'todas' | 'realizadas' | 'pendentes'>('todas');

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.clinicalNotes && s.clinicalNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.topicsAddressed && s.topicsAddressed.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

    if (selectedStatusFilter === 'realizadas') {
      return s.status === 'realizada' && matchesSearch;
    } else if (selectedStatusFilter === 'pendentes') {
      return s.status !== 'realizada' && matchesSearch;
    }

    return matchesSearch;
  }).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date); // Most recent first
    return b.startTime.localeCompare(a.startTime);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-400" />
            <span>Sessões & Prontuários Clínicos</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Registro de evoluções psicoterápicas e histórico confidencial dos atendimentos.
          </p>
        </div>

        <button
          onClick={toggleHideConfidentialData}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
            hideConfidentialData
              ? 'bg-amber-950 text-amber-300 border-amber-700'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {hideConfidentialData ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
          <span>{hideConfidentialData ? 'Modo Sigilo Ativo' : 'Ocultar Prontuários'}</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar paciente ou palavra-chave em evolução..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
          {(['todas', 'realizadas', 'pendentes'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                selectedStatusFilter === filter
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'todas' ? 'Todas' : filter === 'realizadas' ? 'Evoluções Concluídas' : 'Pendentes de Registro'}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum registro de sessão encontrado</h3>
          <p className="text-slate-400 text-xs">
            Tente modificar a busca ou selecione outra categoria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const hasNotes = Boolean(session.clinicalNotes && session.clinicalNotes.trim().length > 0);

            return (
              <div
                key={session.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">
                        {session.patientName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Data: {session.date} | Horário: {session.startTime} às {session.endTime} ({session.type})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasNotes ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Evolução Registrada
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2.5 py-1 rounded-md border border-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Prontuário Pendente
                      </span>
                    )}

                    <button
                      onClick={() => startLiveSession(session)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{hasNotes ? 'Editar Prontuário' : 'Registrar Evolução'}</span>
                    </button>
                  </div>
                </div>

                {/* Clinical Notes Body */}
                <div className="text-xs text-slate-300 space-y-2">
                  <strong className="text-slate-400 block">Evolução Psicoterápica / Prontuário:</strong>
                  {hideConfidentialData ? (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-amber-400/80 font-mono text-[11px] italic">
                      [Prontuário protegido pelo Modo Sigilo]
                    </div>
                  ) : (
                    <p className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap text-slate-200">
                      {session.clinicalNotes || 'Nenhuma evolução preenchida para esta sessão.'}
                    </p>
                  )}
                </div>

                {/* Topics addressed */}
                {session.topicsAddressed && session.topicsAddressed.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500">Tópicos:</span>
                    <div className="flex flex-wrap gap-1">
                      {session.topicsAddressed.map((topic) => (
                        <span
                          key={topic}
                          className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
