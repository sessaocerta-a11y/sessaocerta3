import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Patient, PatientStatus, AttendanceType } from '../../types';
import { StrictDeletePatientModal } from './StrictDeletePatientModal';
import {
  Users,
  Search,
  Plus,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  FileText,
  ShieldCheck,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  MessageCircle,
  Clock,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  MapPin,
  MoreVertical,
  Archive,
  GraduationCap,
  History,
  RotateCcw,
  CalendarPlus
} from 'lucide-react';

interface PatientsViewProps {
  onOpenNewPatientModal: () => void;
  onEditPatientModal: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onOpenNewPatientModal,
  onEditPatientModal
}) => {
  const {
    patients,
    sessions,
    updatePatient,
    deletePatient,
    hideConfidentialData,
    toggleHideConfidentialData,
    profile,
    loadDemoData,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PatientStatus | 'todos'>('todos');
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<Patient | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'geral' | 'prontuario' | 'anamnese' | 'financeiro' | 'historico'>('geral');
  const [openMenuPatientId, setOpenMenuPatientId] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  // Listener para abrir diretamente o prontuário de um paciente (disparado pela assistente Clara)
  React.useEffect(() => {
    const handleOpenDetail = (e: any) => {
      const { patientId, patientName } = e.detail || {};
      const found = patients.find(p => (patientId && p.id === patientId) || (patientName && p.name.toLowerCase().includes(patientName.toLowerCase())));
      if (found) {
        setSelectedPatientForDetail(found);
        setActiveDetailTab('prontuario');
      } else if (patients.length > 0) {
        setSelectedPatientForDetail(patients[patients.length - 1]);
        setActiveDetailTab('prontuario');
      }
    };
    window.addEventListener('open-patient-detail', handleOpenDetail);
    return () => window.removeEventListener('open-patient-detail', handleOpenDetail);
  }, [patients]);

  // Enhanced Filter patients
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.cpf || '').includes(term) ||
      (p.phone || '').includes(term) ||
      (p.email || '').toLowerCase().includes(term) ||
      (p.city || '').toLowerCase().includes(term) ||
      (p.emergencyContactName || '').toLowerCase().includes(term) ||
      (p.emergencyContactPhone || '').includes(term);

    const matchesStatus = selectedStatus === 'todos' || p.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate patient session stats
  const getPatientSessionStats = (patientId: string) => {
    const patientSessions = sessions.filter((s) => s.patientId === patientId);
    const completed = patientSessions.filter((s) => s.status === 'realizada');
    const totalPaid = patientSessions
      .filter((s) => s.paymentStatus === 'pago')
      .reduce((sum, s) => sum + s.price, 0);

    return {
      total: patientSessions.length,
      completedCount: completed.length,
      totalPaid,
      sessionsList: patientSessions,
    };
  };

  const statusBadges: Record<PatientStatus, { label: string; class: string }> = {
    ativo: { label: '🟢 Ativo', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    arquivado: { label: '📦 Arquivado', class: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    alta: { label: '🎓 Alta Terapêutica', class: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    pausa: { label: '⏸ Em Pausa', class: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  };

  // Quick action helpers
  const handleArchive = (p: Patient) => {
    updatePatient(p.id, { status: 'arquivado' }, 'Psicólogo(a)');
    setOpenMenuPatientId(null);
  };

  const handleDischarge = (p: Patient) => {
    updatePatient(p.id, { status: 'alta' }, 'Psicólogo(a)');
    setOpenMenuPatientId(null);
  };

  const handleReactivate = (p: Patient) => {
    updatePatient(p.id, { status: 'ativo' }, 'Psicólogo(a)');
    setOpenMenuPatientId(null);
  };

  const handleScheduleAppointment = (p: Patient) => {
    setOpenMenuPatientId(null);
    // Dispatch custom event to open appointment modal for this patient
    window.dispatchEvent(new CustomEvent('clara-ask-question', {
      detail: { prompt: `Agendar consulta para ${p.name}` }
    }));
  };

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" />
            <span>Gestão de Pacientes & Prontuários</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestão completa do ciclo de vida: cadastrar, consultar, editar, arquivar, dar alta e gerenciar prontuários sigilosos.
          </p>
        </div>

        <button
          onClick={onOpenNewPatientModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Paciente</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, fone, e-mail, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          {(['todos', 'ativo', 'arquivado', 'alta', 'pausa'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === status
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {status === 'todos'
                ? `Todos (${patients.length})`
                : status === 'ativo'
                ? `🟢 Ativos (${patients.filter(p => p.status === 'ativo').length})`
                : status === 'arquivado'
                ? `📦 Arquivados (${patients.filter(p => p.status === 'arquivado').length})`
                : status === 'alta'
                ? `🎓 Alta (${patients.filter(p => p.status === 'alta').length})`
                : `⏸ Pausa (${patients.filter(p => p.status === 'pausa').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filteredPatients.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/80 rounded-2xl border border-dashed border-slate-800 space-y-4 my-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500 mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {patients.length === 0 ? 'Seu consultório ainda não possui pacientes' : 'Nenhum paciente encontrado com esses filtros'}
            </h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
              {patients.length === 0
                ? 'Cadastre o seu primeiro paciente de forma rápida com a assistente Clara ou pela interface.'
                : 'Não encontramos registros com o termo buscado. Tente pesquisar por nome, CPF ou cidade.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenNewPatientModal}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Paciente</span>
            </button>
            {patients.length === 0 && (
              <button
                onClick={loadDemoData}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Carregar Pacientes de Teste (Demo)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => {
            const stats = getPatientSessionStats(patient.id);
            const badge = statusBadges[patient.status] || statusBadges.ativo;
            const isMenuOpen = openMenuPatientId === patient.id;

            return (
              <div
                key={patient.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-md group relative"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {patient.name}
                      </h3>
                      <p className="text-xs text-emerald-400/90 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0 text-emerald-400" />
                        <span>{patient.city || patient.state ? `${patient.city || ''}${patient.state ? (patient.city ? ' - ' : '') + patient.state : ''}` : 'Localidade não informada'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">🪪 CPF: {patient.cpf || 'Não informado'}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.class}`}>
                        {badge.label}
                      </span>

                      {/* Dropdown Menu Trigger Button */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuPatientId(isMenuOpen ? null : patient.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Menu de Ações"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            className="absolute right-0 top-8 z-30 w-52 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-1.5 space-y-1 text-xs text-slate-200 animate-in fade-in zoom-in-95"
                            onMouseLeave={() => setOpenMenuPatientId(null)}
                          >
                            <button
                              onClick={() => {
                                setOpenMenuPatientId(null);
                                onEditPatientModal(patient);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Editar Dados</span>
                            </button>

                            <button
                              onClick={() => handleScheduleAppointment(patient)}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <CalendarPlus className="w-3.5 h-3.5 text-sky-400" />
                              <span>Agendar Consulta</span>
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuPatientId(null);
                                setSelectedPatientForDetail(patient);
                                setActiveDetailTab('prontuario');
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Abrir Prontuário</span>
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuPatientId(null);
                                setSelectedPatientForDetail(patient);
                                setActiveDetailTab('financeiro');
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Financeiro</span>
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuPatientId(null);
                                setSelectedPatientForDetail(patient);
                                setActiveDetailTab('historico');
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5 text-purple-400" />
                              <span>Histórico de Alterações</span>
                            </button>

                            <div className="my-1 border-t border-slate-800/80" />

                            {patient.status !== 'arquivado' ? (
                              <button
                                onClick={() => handleArchive(patient)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-950/40 text-amber-300 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Arquivar Paciente</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(patient)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-950/40 text-emerald-300 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reativar Paciente</span>
                              </button>
                            )}

                            {patient.status !== 'alta' && (
                              <button
                                onClick={() => handleDischarge(patient)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-sky-950/40 text-sky-300 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Dar Alta Terapêutica</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setOpenMenuPatientId(null);
                                setPatientToDelete(patient);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-950/50 text-rose-400 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir Permanentemente</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{patient.phone}</span>
                    </div>
                    {patient.email && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Sessão: <strong className="text-white">R$ {patient.sessionPrice}</strong> ({patient.attendanceType})</span>
                    </div>
                  </div>

                  {/* Emergency contact highlight */}
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                    <span className="font-semibold text-slate-300 block">Contato de Emergência:</span>
                    <p className="text-slate-300">{patient.emergencyContactName} - {patient.emergencyContactPhone}</p>
                  </div>
                </div>

                {/* Patient Stats Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    <strong className="text-emerald-400">{stats.completedCount}</strong> sessões realizadas
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditPatientModal(patient)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar Paciente"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPatientForDetail(patient);
                        setActiveDetailTab('prontuario');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                    >
                      Ver Prontuário
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient Detail & Prontuário Modal */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {selectedPatientForDetail.name}
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      (statusBadges[selectedPatientForDetail.status] || statusBadges.ativo).class
                    }`}
                  >
                    {(statusBadges[selectedPatientForDetail.status] || statusBadges.ativo).label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  CPF: {selectedPatientForDetail.cpf || 'Não informado'} | Data Nasc.: {selectedPatientForDetail.birthDate || 'Não informada'} | Cidade: {selectedPatientForDetail.city || 'Não informada'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleHideConfidentialData}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    hideConfidentialData ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Ocultar notas clínicas da tela"
                >
                  {hideConfidentialData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSelectedPatientForDetail(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 px-6 bg-slate-900/90 overflow-x-auto">
              <button
                onClick={() => setActiveDetailTab('geral')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDetailTab === 'geral'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Dados Gerais & Contato
              </button>

              <button
                onClick={() => setActiveDetailTab('prontuario')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDetailTab === 'prontuario'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Prontuário & Evoluções
              </button>

              <button
                onClick={() => setActiveDetailTab('anamnese')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDetailTab === 'anamnese'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Anamnese Inicial
              </button>

              <button
                onClick={() => setActiveDetailTab('financeiro')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDetailTab === 'financeiro'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Histórico Financeiro
              </button>

              <button
                onClick={() => setActiveDetailTab('historico')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDetailTab === 'historico'
                    ? 'border-purple-400 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 Histórico de Alterações ({selectedPatientForDetail.changeHistory?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {activeDetailTab === 'geral' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                      Informações Pessoais
                    </h3>
                    <div className="space-y-2">
                      <div><strong className="text-slate-400">Telefone / WhatsApp:</strong> {selectedPatientForDetail.phone}</div>
                      <div><strong className="text-slate-400">E-mail:</strong> {selectedPatientForDetail.email || 'Não informado'}</div>
                      <div><strong className="text-slate-400">CPF:</strong> {selectedPatientForDetail.cpf || 'Não informado'}</div>
                      <div><strong className="text-slate-400">Modalidade:</strong> {selectedPatientForDetail.attendanceType}</div>
                      <div><strong className="text-slate-400">Horário Preferencial:</strong> {selectedPatientForDetail.preferredSchedule || 'A combinar'}</div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                      Contato de Emergência
                    </h3>
                    <div className="space-y-2">
                      <div><strong className="text-slate-400">Nome:</strong> {selectedPatientForDetail.emergencyContactName}</div>
                      <div><strong className="text-slate-400">Telefone:</strong> {selectedPatientForDetail.emergencyContactPhone}</div>
                      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                        Obrigatório conforme diretrizes éticas do CFP para gestão de riscos em clínica psicológica.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'prontuario' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Evolução Clínica e Registro das Sessões</h3>
                    {hideConfidentialData && (
                      <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                        Modo Sigilo Ativo (Conteúdo Oculto)
                      </span>
                    )}
                  </div>

                  {getPatientSessionStats(selectedPatientForDetail.id).sessionsList.length === 0 ? (
                    <p className="text-slate-500 text-xs py-6 text-center">Nenhuma sessão registrada para este paciente ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {getPatientSessionStats(selectedPatientForDetail.id).sessionsList.map((session) => (
                        <div key={session.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-emerald-400">
                              Sessão em {session.date} às {session.startTime}
                            </span>
                            <span className="capitalize text-slate-400 font-semibold">{session.status}</span>
                          </div>

                          <div className="text-slate-300 leading-relaxed">
                            <strong className="text-slate-400 block mb-1">Notas de Evolução do Prontuário:</strong>
                            {hideConfidentialData ? (
                              <div className="p-3 bg-slate-900 rounded border border-slate-800 text-amber-400/70 font-mono text-[11px] italic">
                                [Conteúdo do prontuário oculto para proteção visual durante compartilhamento de tela]
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{session.clinicalNotes || 'Nenhuma anotação registrada para esta sessão.'}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'anamnese' && (
                <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
                  <h3 className="font-bold text-white text-sm">Anotações da Anamnese Inicial & Queixa Principal</h3>
                  {hideConfidentialData ? (
                    <div className="p-4 bg-slate-900 rounded border border-slate-800 text-amber-400/70 font-mono italic">
                      [Anamnese oculta pelo Modo Sigilo]
                    </div>
                  ) : (
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedPatientForDetail.initialAnamnesis || 'Nenhum registro de anamnese inserido no cadastro inicial.'}
                    </p>
                  )}
                </div>
              )}

              {activeDetailTab === 'financeiro' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400">Valor Combinado por Sessão:</span>
                      <div className="text-lg font-bold text-emerald-400">R$ {selectedPatientForDetail.sessionPrice}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Pago Acumulado:</span>
                      <div className="text-lg font-bold text-white">
                        R$ {getPatientSessionStats(selectedPatientForDetail.id).totalPaid}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'historico' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    <span>Registro Interno de Modificações & Auditoria</span>
                  </h3>

                  {(!selectedPatientForDetail.changeHistory || selectedPatientForDetail.changeHistory.length === 0) ? (
                    <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/80 text-slate-500">
                      Nenhuma alteração registrada até o momento. O cadastro permanece original.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedPatientForDetail.changeHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-300">{item.field}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                                {item.timestamp}
                              </span>
                            </div>
                            <div className="text-slate-300 flex items-center gap-2">
                              <span className="line-through text-slate-500">{item.oldValue}</span>
                              <span className="text-slate-400">➔</span>
                              <strong className="text-emerald-400">{item.newValue}</strong>
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                            Por: {item.user}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const p = selectedPatientForDetail;
                    setSelectedPatientForDetail(null);
                    onEditPatientModal(p);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar Cadastro</span>
                </button>

                {selectedPatientForDetail.status !== 'arquivado' ? (
                  <button
                    onClick={() => {
                      const p = selectedPatientForDetail;
                      handleArchive(p);
                      setSelectedPatientForDetail({ ...p, status: 'arquivado' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Arquivar</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const p = selectedPatientForDetail;
                      handleReactivate(p);
                      setSelectedPatientForDetail({ ...p, status: 'ativo' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reativar</span>
                  </button>
                )}

                {selectedPatientForDetail.status !== 'alta' && (
                  <button
                    onClick={() => {
                      const p = selectedPatientForDetail;
                      handleDischarge(p);
                      setSelectedPatientForDetail({ ...p, status: 'alta' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border border-sky-800/50 transition-colors cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Dar Alta</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const p = selectedPatientForDetail;
                    setSelectedPatientForDetail(null);
                    setPatientToDelete(p);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Permanentemente</span>
                </button>

                <button
                  onClick={() => setSelectedPatientForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Fechar Prontuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strict Delete Confirmation Modal */}
      {patientToDelete && (
        <StrictDeletePatientModal
          patient={patientToDelete}
          onClose={() => setPatientToDelete(null)}
          onConfirmDelete={(pId) => {
            deletePatient(pId);
            setPatientToDelete(null);
          }}
          onArchivePatient={(pId) => {
            updatePatient(pId, { status: 'arquivado' }, 'Psicólogo(a)');
            setPatientToDelete(null);
          }}
        />
      )}
    </div>
  );
};
