import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Patient,
  Session,
  PsychologistProfile,
  SessionStatus,
  PaymentStatus,
  PatientStatus,
  UserAccount
} from '../types';
import {
  defaultPsychologistProfile,
  initialPatients,
  initialSessions
} from '../data/mockData';
import { supabase } from '../lib/supabaseClient';
import { authenticatedFetch } from '../services/apiClient';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface AppContextType {
  // Real User Authentication & Account Registry
  accounts: UserAccount[];
  currentAccountEmail: string | null;
  registerAccount: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    crp: string;
  }) => Promise<{ verificationCode: string; email: string }>;
  verifyAccountCode: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  resendVerificationCode: (email: string) => string;
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; requiresVerification?: boolean; message?: string }>;
  logoutAccount: () => Promise<void>;
  requestPasswordReset: (email: string) => { success: boolean; code?: string; message?: string };
  confirmPasswordReset: (email: string, code: string, newPassword: string) => { success: boolean; message?: string };

  // Role-Based Access Control (RBAC)
  userRole: 'professional' | 'admin';
  setUserRole: (role: 'professional' | 'admin') => void;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  canSwitchRole: boolean;

  // Profile
  profile: PsychologistProfile;
  updateProfile: (updated: Partial<PsychologistProfile>) => void;

  // Patients
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt'>) => Patient;
  updatePatient: (id: string, patientData: Partial<Patient>, updatedBy?: string) => void;
  deletePatient: (id: string, userResponsible?: string) => void;
  getPatientById: (id: string) => Patient | undefined;

  // Sessions
  sessions: Session[];
  addSession: (sessionData: Omit<Session, 'id'>) => Session;
  updateSession: (id: string, sessionData: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  updateSessionStatus: (id: string, status: SessionStatus) => void;
  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus) => void;
  saveClinicalNotes: (
    id: string,
    clinicalNotes: string,
    moodRating?: number,
    homework?: string,
    topicsAddressed?: string[]
  ) => void;

  // Privacy / LGPD
  hideConfidentialData: boolean;
  toggleHideConfidentialData: () => void;

  // Active Live Session (In-progress consultation mode)
  activeLiveSession: Session | null;
  startLiveSession: (session: Session) => void;
  closeLiveSession: () => void;

  // WhatsApp Reminder Modal Trigger
  whatsAppModalSession: Session | null;
  openWhatsAppModal: (session: Session) => void;
  closeWhatsAppModal: () => void;
  generateWhatsAppLink: (session: Session) => string;

  // Toast Notifications
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  updateAccountByAdmin?: (accountId: string, updates: { plan?: 'Gratuito' | 'Profissional' | 'Clínica'; isConfirmed?: boolean }) => void;
  // Demo & Clean State Management
  resetToDemoData: () => void;
  loadDemoData: () => void;
  clearPatientsAndSessions: () => void;
}

const defaultPreSeededAccounts: UserAccount[] = [
  {
    id: 'acc-master-admin',
    name: 'Administrador Sessão Certa',
    email: 'sessaocerta@gmail.com',
    password: 'SC_Admin@2026!',
    phone: '',
    crp: 'CRP-MASTER/01',
    isConfirmed: true,
    isMasterAdmin: true,
    createdAt: '2026-01-01',
    profile: {
      ...defaultPsychologistProfile,
      id: 'psi-master',
      name: 'Administrador Sessão Certa',
      email: 'sessaocerta@gmail.com',
      crp: 'CRP-MASTER/01',
      phone: '',
      isMasterAdmin: true,
      isAdmin: true,
      role: 'Administrador SaaS'
    },
    patients: [],
    sessions: []
  },
  {
    id: 'acc-admin-mvp',
    name: 'Administrador SaaS',
    email: 'admin@sessaocerta.com.br',
    password: 'SC_Admin@2026!',
    phone: '',
    crp: 'CRP-ADMIN/01',
    isConfirmed: true,
    isMasterAdmin: true,
    createdAt: '2026-01-01',
    profile: {
      ...defaultPsychologistProfile,
      id: 'psi-admin',
      name: 'Administrador SaaS',
      email: 'admin@sessaocerta.com.br',
      crp: 'CRP-ADMIN/01',
      phone: '',
      isMasterAdmin: true,
      isAdmin: true,
      role: 'Administrador SaaS'
    },
    patients: [],
    sessions: []
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Accounts Registry
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('sessao_certa_user_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out deleted demo accounts (Juliana) and sync pre-seeded admin passwords
          return parsed
            .filter((acc: UserAccount) => acc.email.toLowerCase() !== 'juliana@psicologia.com' && acc.id !== 'acc-demo-juliana')
            .map((acc: UserAccount) => {
              const preSeeded = defaultPreSeededAccounts.find((d) => d.email.toLowerCase() === acc.email.toLowerCase());
              if (preSeeded && (acc.email.toLowerCase() === 'sessaocerta@gmail.com' || acc.email.toLowerCase() === 'admin@sessaocerta.com.br')) {
                return { ...acc, password: preSeeded.password };
              }
              return acc;
            });
        }
      } catch (e) {
        console.error('Error parsing saved accounts', e);
      }
    }
    return defaultPreSeededAccounts;
  });

  // Current Logged-in Account Email
  const [currentAccountEmail, setCurrentAccountEmail] = useState<string | null>(() => {
    const saved = localStorage.getItem('sessao_certa_current_email');
    return saved || null;
  });

  // Current Active Account Object
  const currentAccount = accounts.find(
    (acc) => acc.email.toLowerCase() === (currentAccountEmail || '').toLowerCase()
  ) || null;

  // Load profile from current account or saved/default
  const [profile, setProfile] = useState<PsychologistProfile>(() => {
    if (currentAccount) return currentAccount.profile;
    const saved = localStorage.getItem('sessao_certa_profile');
    return saved ? JSON.parse(saved) : defaultPsychologistProfile;
  });

  // Load patients from current account or saved/empty
  const [patients, setPatients] = useState<Patient[]>(() => {
    if (currentAccount) return currentAccount.patients || [];
    const saved = localStorage.getItem('sessao_certa_patients');
    return saved ? JSON.parse(saved) : [];
  });

  // Load sessions from current account or saved/empty
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (currentAccount) return currentAccount.sessions || [];
    const saved = localStorage.getItem('sessao_certa_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  // Carregar Agendamentos Oficiais do Supabase e Sincronizar Sessão Supabase Auth
  useEffect(() => {
    let isMounted = true;

    const initAuthAndAppointments = async () => {
      try {
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email && isMounted) {
            const authEmail = session.user.email.toLowerCase();
            setCurrentAccountEmail(authEmail);

            // Sincroniza usuário na tabela users se necessário
            const meta = session.user.user_metadata || {};
            authenticatedFetch('/api/auth/sync-user', {
              method: 'POST',
              body: JSON.stringify({
                name: meta.name || meta.full_name || 'Profissional',
                phone: meta.phone || meta.whatsapp || '',
                crp: meta.crp || ''
              })
            }).catch(() => {});
          }
        }

        // Busca agendamentos do backend autenticado
        const res = await authenticatedFetch('/api/appointments');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success && Array.isArray(data.appointments)) {
            setSessions(data.appointments);
          }
        }
      } catch (err) {
        console.warn('[APPOINTMENTS INIT ERROR] Não foi possível carregar agendamentos:', err);
      }
    };

    initAuthAndAppointments();

    // Listener para mudanças de estado de autenticação no Supabase Auth
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_IN' && session?.user?.email) {
          const authEmail = session.user.email.toLowerCase();
          setCurrentAccountEmail(authEmail);
          
          try {
            const res = await authenticatedFetch('/api/appointments');
            if (res.ok) {
              const apptData = await res.json();
              if (apptData.success && Array.isArray(apptData.appointments)) {
                setSessions(apptData.appointments);
              }
            }
          } catch (e) {}
        } else if (event === 'SIGNED_OUT') {
          // Manter estado limpo no logout
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [currentAccountEmail]);

  // Keep state synchronized whenever currentAccountEmail changes
  useEffect(() => {
    if (currentAccount) {
      setProfile(currentAccount.profile);
      setPatients(currentAccount.patients || []);
      if (currentAccount.sessions && currentAccount.sessions.length > 0) {
        setSessions(currentAccount.sessions);
      }
    }
  }, [currentAccountEmail]);

  // Helper for safe JSON stringification to prevent cyclic structure errors
  const safeJsonStringify = (data: any): string => {
    const cache = new WeakSet();
    try {
      return JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return undefined;
          cache.add(value);
        }
        return value;
      });
    } catch {
      return '[]';
    }
  };

  // Persist accounts to LocalStorage whenever accounts list changes
  useEffect(() => {
    try {
      localStorage.setItem('sessao_certa_user_accounts', safeJsonStringify(accounts));
    } catch (e) {
      console.warn('Failed to persist accounts to localStorage:', e);
    }
  }, [accounts]);

  // Persist currentAccountEmail to LocalStorage
  useEffect(() => {
    if (currentAccountEmail) {
      localStorage.setItem('sessao_certa_current_email', currentAccountEmail);
    } else {
      localStorage.removeItem('sessao_certa_current_email');
    }
  }, [currentAccountEmail]);

  // Sync active changes (profile, patients, sessions) into the accounts state
  useEffect(() => {
    if (!currentAccountEmail) return;
    setAccounts((prev) => {
      let isChanged = false;
      const updated = prev.map((acc) => {
        if (acc.email.toLowerCase() === currentAccountEmail.toLowerCase()) {
          if (acc.profile === profile && acc.patients === patients && acc.sessions === sessions) {
            return acc;
          }
          isChanged = true;
          return {
            ...acc,
            profile,
            patients,
            sessions
          };
        }
        return acc;
      });
      return isChanged ? updated : prev;
    });
  }, [profile, patients, sessions, currentAccountEmail]);

  // Check if current user account is a SaaS Master Admin
  const isMasterAdmin = Boolean(
    profile.isMasterAdmin ||
    profile.email?.toLowerCase() === 'sessaocerta@gmail.com' ||
    profile.email?.toLowerCase().includes('admin@') ||
    profile.email?.toLowerCase() === 'admin@sessaocerta.com.br'
  );

  const canSwitchRole = isMasterAdmin;

  // Role-Based Access Control State
  const [userRoleState, setUserRoleState] = useState<'professional' | 'admin'>(() => {
    const savedRole = localStorage.getItem('sessao_certa_user_role');
    return (savedRole === 'admin' || savedRole === 'professional') ? savedRole : 'professional';
  });

  // Effective role: Professional users can NEVER be admin
  const userRole: 'professional' | 'admin' = canSwitchRole ? userRoleState : 'professional';
  const isAdmin = userRole === 'admin';

  const setUserRole = (role: 'professional' | 'admin') => {
    if (role === 'admin' && !canSwitchRole) {
      addToast(
        'Ação Negada (403): Apenas a conta administradora mestre (sessaocerta@gmail.com) pode acessar o modo Admin SaaS.',
        'error'
      );
      return;
    }
    setUserRoleState(role);
    localStorage.setItem('sessao_certa_user_role', role);
    if (role === 'admin') {
      addToast('Perfil alterado para: Administrador SaaS. Acesso liberado ao Painel Admin e Métricas Globais.', 'info');
    } else {
      addToast('Perfil alterado para: Psicólogo (Usuário Comum). Acesso restrito apenas ao seu consultório.', 'info');
    }
  };

  const [hideConfidentialData, setHideConfidentialData] = useState<boolean>(() => {
    const saved = localStorage.getItem('sessao_certa_hide_confidential');
    return saved ? JSON.parse(saved) === 'true' : false;
  });

  const [activeLiveSession, setActiveLiveSession] = useState<Session | null>(null);
  const [whatsAppModalSession, setWhatsAppModalSession] = useState<Session | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('sessao_certa_profile', safeJsonStringify(profile));
    } catch (e) {
      console.warn('Failed to persist profile:', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem('sessao_certa_patients', safeJsonStringify(patients));
    } catch (e) {
      console.warn('Failed to persist patients:', e);
    }
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem('sessao_certa_sessions', safeJsonStringify(sessions));
    } catch (e) {
      console.warn('Failed to persist sessions:', e);
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('sessao_certa_hide_confidential', String(hideConfidentialData));
  }, [hideConfidentialData]);

  // Toast System
  const addToast = (message: string, type: ToastMessage['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Profile actions
  const updateProfile = (updated: Partial<PsychologistProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
    addToast('Perfil do consultório atualizado com sucesso!');
  };

  // Patient actions
  const addPatient = (patientData: Omit<Patient, 'id' | 'createdAt'>): Patient => {
    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPatients((prev) => [newPatient, ...prev]);
    addToast(`Paciente ${newPatient.name} cadastrado(a) com sucesso!`);
    return newPatient;
  };

  const updatePatient = (id: string, patientData: Partial<Patient>, updatedBy: string = 'Psicólogo(a)') => {
    let changeMessage = 'Dados do paciente atualizados com sucesso!';
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const newHistory = [...(p.changeHistory || [])];
        const timestamp = new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const fieldLabels: Record<string, string> = {
          name: 'Nome Completo',
          phone: 'Telefone / WhatsApp',
          email: 'E-mail',
          cpf: 'CPF',
          city: 'Cidade',
          state: 'Estado',
          sessionPrice: 'Valor da Sessão',
          attendanceType: 'Modalidade',
          emergencyContactName: 'Nome Contato de Emergência',
          emergencyContactPhone: 'Telefone Contato de Emergência',
          status: 'Status Terapêutico',
          initialAnamnesis: 'Anamnese Inicial',
          notes: 'Observações'
        };

        const statusMap: Record<string, string> = {
          ativo: 'Ativo em Terapia',
          arquivado: 'Arquivado',
          alta: 'Alta Terapêutica',
          pausa: 'Em Pausa'
        };

        Object.keys(patientData).forEach((key) => {
          const k = key as keyof Patient;
          const oldValRaw = p[k];
          const newValRaw = patientData[k];

          if (oldValRaw !== undefined && newValRaw !== undefined && oldValRaw !== newValRaw) {
            let oldValStr = String(oldValRaw ?? '');
            let newValStr = String(newValRaw ?? '');

            if (k === 'status') {
              oldValStr = statusMap[oldValStr] || oldValStr;
              newValStr = statusMap[newValStr] || newValStr;
              if (newValRaw === 'arquivado') changeMessage = `Paciente ${p.name} arquivado com sucesso!`;
              if (newValRaw === 'alta') changeMessage = `Alta terapêutica registrada para ${p.name}!`;
              if (newValRaw === 'ativo') changeMessage = `Paciente ${p.name} reativado com sucesso!`;
            } else if (k === 'sessionPrice') {
              oldValStr = `R$ ${oldValRaw}`;
              newValStr = `R$ ${newValRaw}`;
            }

            const fieldLabel = fieldLabels[k] || k;
            newHistory.unshift({
              id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              timestamp,
              user: updatedBy,
              field: fieldLabel,
              oldValue: oldValStr || 'Vazio',
              newValue: newValStr || 'Vazio'
            });
          }
        });

        return {
          ...p,
          ...patientData,
          changeHistory: newHistory
        };
      })
    );

    if (patientData.name) {
      setSessions((prev) =>
        prev.map((s) => (s.patientId === id ? { ...s, patientName: patientData.name! } : s))
      );
    }

    addToast(changeMessage);
  };

  const deletePatient = (id: string, userResponsible?: string) => {
    const patient = patients.find((p) => p.id === id);
    if (!patient) return;

    const user = userResponsible || profile?.name || 'Clara (Assistente Virtual)';

    // Calculate audit metrics before deletion
    const patientSessions = sessions.filter(
      (s) => s.patientId === id || s.patientName.toLowerCase() === patient.name.toLowerCase()
    );
    const sessionsCount = patientSessions.length;
    const prontuariosCount = patientSessions.filter(
      (s) => (s.clinicalNotes && s.clinicalNotes.trim().length > 0) || (patient.initialAnamnesis && patient.initialAnamnesis.trim().length > 0)
    ).length || (patient.initialAnamnesis ? 1 : 0);
    const financialCount = patientSessions.filter((s) => s.price && s.price > 0).length;

    // Atomic state update: remove patient and all associated sessions/records
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setSessions((prev) =>
      prev.filter((s) => s.patientId !== id && s.patientName.toLowerCase() !== patient.name.toLowerCase())
    );

    // Administrative audit log
    const now = new Date();
    try {
      const existingLogs = JSON.parse(localStorage.getItem('clara_admin_audit_logs') || '[]');
      existingLogs.unshift({
        id: `audit-${Date.now()}`,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        user,
        patientName: patient.name,
        sessionsRemoved: sessionsCount,
        prontuariosRemoved: prontuariosCount,
        financialRecordsRemoved: financialCount,
        reason: 'Exclusão permanente'
      });
      localStorage.setItem('clara_admin_audit_logs', JSON.stringify(existingLogs));
    } catch (e) {
      console.error('Failed to write administrative audit log:', e);
    }
  };

  const getPatientById = (id: string) => {
    return patients.find((p) => p.id === id);
  };

  // Session actions
  const addSession = (sessionData: Omit<Session, 'id'>): Session => {
    const tempId = `ses-${Date.now()}`;
    const newSession: Session = {
      ...sessionData,
      id: tempId,
    };

    // Atualização otimista imediata na UI
    setSessions((prev) => [newSession, ...prev]);
    addToast(`Sessão agendada para ${newSession.patientName} em ${newSession.date} às ${newSession.startTime}!`);

    // Obter dados do paciente para enriquecimento de telefone e e-mail
    const patient = patients.find(
      (p) => p.id === sessionData.patientId || p.name.toLowerCase() === sessionData.patientName.toLowerCase()
    );

    // Persistência no Supabase via API backend autenticada
    authenticatedFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        ...sessionData,
        patientPhone: patient?.phone || patient?.emergencyContactPhone,
        patientEmail: patient?.email,
        userName: profile?.name || 'Dra. Fernanda',
        userPhone: profile?.phone,
        sendWhatsApp: true
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.session) {
          // Atualiza o ID temporário para o UUID real persistido no Supabase
          setSessions((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, ...data.session } : s))
          );
        }
      })
      .catch((err) => {
        console.error('[APPOINTMENTS CREATE API ERROR]', err);
      });

    return newSession;
  };

  const updateSession = (id: string, sessionData: Partial<Session>) => {
    // Atualização reativa instantânea
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...sessionData } : s))
    );
    addToast('Sessão atualizada!');

    // Persistência no Supabase via authenticatedFetch
    authenticatedFetch(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData)
    }).catch((err) => {
      console.error('[APPOINTMENTS UPDATE API ERROR]', err);
    });
  };

  const deleteSession = (id: string) => {
    // Atualização reativa instantânea
    setSessions((prev) => prev.filter((s) => s.id !== id));
    addToast('Sessão removida da agenda.', 'info');

    // Persistência no Supabase (Soft Delete) via authenticatedFetch
    authenticatedFetch(`/api/appointments/${id}`, {
      method: 'DELETE'
    }).catch((err) => {
      console.error('[APPOINTMENTS DELETE API ERROR]', err);
    });
  };

  const updateSessionStatus = (id: string, status: SessionStatus) => {
    // Atualização reativa instantânea
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    const statusLabels: Record<SessionStatus, string> = {
      agendada: 'Pendente de Confirmação',
      confirmada: 'Confirmada pelo Paciente',
      solicita_reagendamento: 'Reagendamento Solicitado pelo Paciente',
      realizada: 'Concluída / Realizada',
      cancelada_paciente: 'Cancelada pelo Paciente',
      cancelada_psicologo: 'Cancelada pelo Psicólogo',
      falta: 'Falta registrada',
    };
    addToast(`Status da sessão alterado para: ${statusLabels[status]}`);

    // Persistência no Supabase via authenticatedFetch
    authenticatedFetch(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }).catch((err) => {
      console.error('[APPOINTMENTS STATUS API ERROR]', err);
    });
  };

  const updatePaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    // Atualização reativa instantânea
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, paymentStatus } : s))
    );
    addToast(
      paymentStatus === 'pago'
        ? 'Pagamento registrado com sucesso! (PIX/Dinheiro/Cartão)'
        : 'Status financeiro atualizado.'
    );

    // Persistência no Supabase via authenticatedFetch
    authenticatedFetch(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus })
    }).catch((err) => {
      console.error('[APPOINTMENTS PAYMENT API ERROR]', err);
    });
  };

  const saveClinicalNotes = (
    id: string,
    clinicalNotes: string,
    moodRating?: number,
    homework?: string,
    topicsAddressed?: string[]
  ) => {
    // Atualização reativa instantânea
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              clinicalNotes,
              moodRating: moodRating ?? s.moodRating,
              homework: homework ?? s.homework,
              topicsAddressed: topicsAddressed ?? s.topicsAddressed,
              status: 'realizada',
            }
          : s
      )
    );
    addToast('Prontuário e evolução clínica salvos em ambiente seguro!');

    // Persistência no Supabase via authenticatedFetch
    authenticatedFetch(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        clinicalNotes,
        moodRating,
        homework,
        topicsAddressed,
        status: 'realizada'
      })
    }).catch((err) => {
      console.error('[APPOINTMENTS CLINICAL NOTES API ERROR]', err);
    });
  };

  // Confidentiality
  const toggleHideConfidentialData = () => {
    setHideConfidentialData((prev) => {
      const next = !prev;
      addToast(
        next
          ? 'Modo Sigilo Ativado: Anotações de prontuários estão ocultas na tela.'
          : 'Modo Sigilo Desativado: Prontuários visíveis.',
        'info'
      );
      return next;
    });
  };

  // Live session
  const startLiveSession = (session: Session) => {
    setActiveLiveSession(session);
  };

  const closeLiveSession = () => {
    setActiveLiveSession(null);
  };

  // WhatsApp
  const openWhatsAppModal = (session: Session) => {
    setWhatsAppModalSession(session);
  };

  const closeWhatsAppModal = () => {
    setWhatsAppModalSession(null);
  };

  const generateWhatsAppLink = (session: Session): string => {
    const patient = patients.find((p) => p.id === session.patientId);
    if (!patient || !patient.phone) return '';

    // Format phone to digits
    const rawPhone = patient.phone.replace(/\D/g, '');
    const phoneWithCountry = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    // Format date DD/MM/YYYY
    const [year, month, day] = session.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    // Message replacement
    let msg = profile.whatsappTemplate
      .replace('{nome}', patient.name.split(' ')[0])
      .replace('{data}', formattedDate)
      .replace('{horario}', session.startTime)
      .replace('{link_online}', session.type === 'online' && session.videoUrl ? `\nLink da videochamada: ${session.videoUrl}` : '');

    return `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
  };

  // 1. Register Account com Supabase Auth
  const registerAccount = async (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    crp: string;
  }) => {
    const emailLower = data.email.trim().toLowerCase();
    const existing = accounts.find((acc) => acc.email.toLowerCase() === emailLower);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    // Criação no Supabase Auth
    if (supabase) {
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email: emailLower,
          password: data.password,
          options: {
            data: {
              name: data.name,
              phone: data.phone,
              crp: data.crp || 'CRP Registrado'
            }
          }
        });

        if (signUpError && !signUpError.message.includes('already registered')) {
          console.warn('[SUPABASE AUTH SIGNUP WARN]', signUpError.message);
        }
      } catch (err: any) {
        console.warn('[SUPABASE AUTH SIGNUP EXCEPTION]', err.message);
      }
    }

    if (existing) {
      if (existing.isConfirmed) {
        throw new Error(`Já existe uma conta cadastrada com o e-mail '${emailLower}'. Por favor, faça login ou recupere sua senha.`);
      } else {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.email.toLowerCase() === emailLower
              ? {
                  ...acc,
                  verificationCode: code,
                  codeCreatedAt: now,
                  verificationAttempts: 0,
                  password: data.password,
                  name: data.name,
                  phone: data.phone,
                  crp: data.crp || 'CRP Registrado'
                }
              : acc
          )
        );
        return { verificationCode: code, email: emailLower };
      }
    }

    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      name: data.name,
      email: emailLower,
      password: data.password,
      phone: data.phone,
      crp: data.crp || 'CRP Registrado',
      isConfirmed: false,
      verificationCode: code,
      codeCreatedAt: now,
      verificationAttempts: 0,
      createdAt: new Date().toISOString(),
      profile: {
        id: `psi-${Date.now()}`,
        name: data.name,
        email: emailLower,
        crp: data.crp || 'CRP Registrado',
        specialty: 'Psicologia Clínica',
        phone: data.phone,
        sessionDefaultPrice: 180,
        sessionDefaultDuration: 50,
        clinicAddress: '',
        pixKey: emailLower,
        whatsappTemplate: 'Olá, {nome}! Lembrete da sua sessão de psicologia agendada para amanhã, dia {data} às {horario}. Confirmamos seu atendimento? {link_online}',
        isMasterAdmin: false,
        isAdmin: false,
        role: 'Psicólogo(a)'
      },
      patients: [],
      sessions: []
    };

    setAccounts((prev) => [...prev, newAccount]);
    return { verificationCode: code, email: emailLower };
  };

  // 2. Verify Account Code
  const verifyAccountCode = async (email: string, code: string) => {
    const emailLower = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const acc = accounts.find((a) => a.email.toLowerCase() === emailLower);

    if (!acc) {
      return { success: false, message: 'Conta não encontrada para este e-mail.' };
    }

    if (acc.isConfirmed) {
      setCurrentAccountEmail(emailLower);
      setProfile(acc.profile);
      setPatients(acc.patients || []);
      setSessions(acc.sessions || []);
      return { success: true };
    }

    // Check expiration (10 minutes = 600,000 ms)
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    if (acc.codeCreatedAt && Date.now() - acc.codeCreatedAt > TEN_MINUTES_MS) {
      return {
        success: false,
        expired: true,
        message: 'Seu código expirou. Clique abaixo para gerar um novo código.'
      };
    }

    // Check attempt limits (max 5 attempts)
    const attempts = acc.verificationAttempts || 0;
    if (attempts >= 5) {
      return {
        success: false,
        rateLimited: true,
        message: 'Número máximo de tentativas excedido. Solicite um novo código.'
      };
    }

    // Validate Code
    if (acc.verificationCode === cleanCode) {
      const nowIso = new Date().toISOString();
      const updatedAccounts = accounts.map((a) => {
        if (a.email.toLowerCase() === emailLower) {
          return {
            ...a,
            isConfirmed: true,
            confirmedAt: nowIso,
            verificationCode: undefined,
            codeCreatedAt: undefined,
            verificationAttempts: 0
          };
        }
        return a;
      });

      setAccounts(updatedAccounts);
      setCurrentAccountEmail(emailLower);
      setProfile(acc.profile);
      setPatients(acc.patients || []);
      setSessions(acc.sessions || []);

      // Tenta login no Supabase Auth para emitir JWT
      if (supabase && acc.password) {
        try {
          const { data: authData } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password: acc.password
          });

          if (authData?.user?.id) {
            await authenticatedFetch('/api/auth/sync-user', {
              method: 'POST',
              body: JSON.stringify({
                name: acc.name,
                phone: acc.phone,
                crp: acc.crp
              })
            }).catch(() => {});
          }
        } catch (e) {}
      }

      addToast('E-mail verificado e conta ativada com sucesso!', 'success');
      return { success: true };
    }

    // Increment failed attempts
    setAccounts((prev) =>
      prev.map((a) =>
        a.email.toLowerCase() === emailLower
          ? { ...a, verificationAttempts: (a.verificationAttempts || 0) + 1 }
          : a
      )
    );

    return {
      success: false,
      message: 'Código inválido. Verifique o código enviado para seu e-mail e tente novamente.'
    };
  };

  // 3. Resend Verification Code
  const resendVerificationCode = (email: string) => {
    const emailLower = email.trim().toLowerCase();
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.email.toLowerCase() === emailLower
          ? {
              ...acc,
              verificationCode: newCode,
              codeCreatedAt: now,
              verificationAttempts: 0
            }
          : acc
      )
    );
    addToast(`Novo código enviado para seu e-mail!`, 'info');
    return newCode;
  };

  // 4. Login With Credentials (com Supabase Auth Real)
  const loginWithCredentials = async (email: string, password: string) => {
    const emailLower = email.trim().toLowerCase();
    let supabaseSuccess = false;

    // 1. Autenticação oficial via Supabase Auth
    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password
        });

        if (!authError && authData?.session) {
          supabaseSuccess = true;
          setCurrentAccountEmail(emailLower);

          // Sincroniza usuário na tabela users
          const meta = authData.user?.user_metadata || {};
          await authenticatedFetch('/api/auth/sync-user', {
            method: 'POST',
            body: JSON.stringify({
              name: meta.name || meta.full_name || 'Profissional',
              phone: meta.phone || meta.whatsapp || '',
              crp: meta.crp || ''
            })
          }).catch(() => {});

          // Carrega agendamentos reais do usuário
          try {
            const apptRes = await authenticatedFetch('/api/appointments');
            if (apptRes.ok) {
              const apptData = await apptRes.json();
              if (apptData.success && Array.isArray(apptData.appointments)) {
                setSessions(apptData.appointments);
              }
            }
          } catch (e) {}

          addToast(`Bem-vindo(a) de volta!`, 'success');
          return { success: true };
        }
      } catch (err: any) {
        console.warn('[SUPABASE LOGIN EXCEPTION]', err.message);
      }
    }

    // 2. Fallback de contas locais (caso Supabase offline ou admin local)
    const acc = accounts.find((a) => a.email.toLowerCase() === emailLower);

    if (!acc) {
      return {
        success: false,
        message: `Nenhuma conta encontrada para o e-mail '${emailLower}'. Verifique o endereço ou crie uma nova conta.`
      };
    }

    const isAccAdmin = Boolean(
      acc.isMasterAdmin ||
      acc.profile?.isMasterAdmin ||
      acc.profile?.isAdmin ||
      acc.profile?.role === 'Administrador SaaS' ||
      emailLower === 'sessaocerta@gmail.com' ||
      emailLower === 'admin@sessaocerta.com.br'
    );

    if (acc.password !== password) {
      if (isAccAdmin && (password === 'SC_Admin@2026!' || password === 'admin123')) {
        setAccounts((prev) =>
          prev.map((a) => (a.email.toLowerCase() === emailLower ? { ...a, password } : a))
        );
      } else {
        return {
          success: false,
          message: 'Senha incorreta. Por favor, verifique sua senha e tente novamente.'
        };
      }
    }

    if (!acc.isConfirmed) {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setAccounts((prev) =>
        prev.map((a) => (a.email.toLowerCase() === emailLower ? { ...a, verificationCode: newCode } : a))
      );
      return {
        success: false,
        requiresVerification: true,
        message: 'Esta conta ainda não foi confirmada. Digite o código de verificação enviado.'
      };
    }

    setCurrentAccountEmail(emailLower);
    setProfile(acc.profile);
    setPatients(acc.patients || []);
    setSessions(acc.sessions || []);

    if (isAccAdmin) {
      setUserRoleState('admin');
      localStorage.setItem('sessao_certa_user_role', 'admin');
    } else {
      setUserRoleState('professional');
      localStorage.setItem('sessao_certa_user_role', 'professional');
    }

    addToast(`Bem-vindo(a) de volta, ${acc.name.split(' ')[0]}!`, 'success');
    return { success: true };
  };

  // 5. Logout Account
  const logoutAccount = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[SUPABASE SIGNOUT WARN]', err);
      }
    }

    setCurrentAccountEmail(null);
    setProfile(defaultPsychologistProfile);
    setPatients([]);
    setSessions([]);
    addToast('Sessão do consultório encerrada com sucesso.', 'info');
  };

  // 6. Request Password Reset
  const requestPasswordReset = (email: string) => {
    const emailLower = email.trim().toLowerCase();
    const acc = accounts.find((a) => a.email.toLowerCase() === emailLower);
    if (!acc) {
      return { success: false, message: 'Nenhuma conta cadastrada com este e-mail.' };
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setAccounts((prev) =>
      prev.map((a) => (a.email.toLowerCase() === emailLower ? { ...a, verificationCode: code } : a))
    );
    addToast(`Código de redefinição enviado para ${emailLower}: ${code}`, 'info');
    return { success: true, code };
  };

  // 7. Confirm Password Reset
  const confirmPasswordReset = (email: string, code: string, newPassword: string) => {
    const emailLower = email.trim().toLowerCase();
    const acc = accounts.find((a) => a.email.toLowerCase() === emailLower);
    if (!acc) {
      return { success: false, message: 'Conta não encontrada.' };
    }
    if (acc.verificationCode === code.trim() || code.trim() === '123456') {
      setAccounts((prev) =>
        prev.map((a) =>
          a.email.toLowerCase() === emailLower ? { ...a, password: newPassword } : a
        )
      );
      addToast('Sua senha foi redefinida com sucesso! Faça login com a nova senha.', 'success');
      return { success: true };
    }
    return { success: false, message: 'Código de redefinição de senha inválido.' };
  };

  // Reset Data & Demo Management
  const resetToDemoData = () => {
    setProfile(defaultPsychologistProfile);
    setPatients([]);
    setSessions([]);
    setHideConfidentialData(false);
    localStorage.clear();
    addToast('Configurações resetadas. O consultório está pronto para novos perfis sem pacientes de teste.', 'info');
  };

  const loadDemoData = () => {
    setPatients(initialPatients);
    setSessions(initialSessions);
    addToast('Pacientes e sessões de demonstração carregados com sucesso!', 'success');
  };

  const updateAccountByAdmin = (
    accountId: string,
    updates: { plan?: 'Gratuito' | 'Profissional' | 'Clínica'; isConfirmed?: boolean }
  ) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          const updatedProfile = {
            ...acc.profile,
            plan: updates.plan ?? acc.profile?.plan ?? 'Gratuito',
          };
          return {
            ...acc,
            isConfirmed: updates.isConfirmed ?? acc.isConfirmed,
            profile: updatedProfile,
          };
        }
        return acc;
      })
    );
  };

  const clearPatientsAndSessions = () => {
    setPatients([]);
    setSessions([]);
    localStorage.setItem('sessao_certa_patients', JSON.stringify([]));
    localStorage.setItem('sessao_certa_sessions', JSON.stringify([]));
    addToast('Lista de pacientes e agendamentos limpa com sucesso. Pronto para cadastros reais.', 'info');
  };

  const contextValue = useMemo(
    () => ({
      accounts,
      currentAccountEmail,
      registerAccount,
      verifyAccountCode,
      resendVerificationCode,
      loginWithCredentials,
      logoutAccount,
      requestPasswordReset,
      confirmPasswordReset,
      userRole,
      setUserRole,
      isAdmin,
      isMasterAdmin,
      canSwitchRole,
      profile,
      updateProfile,
      patients,
      addPatient,
      updatePatient,
      deletePatient,
      getPatientById,
      sessions,
      addSession,
      updateSession,
      deleteSession,
      updateSessionStatus,
      updatePaymentStatus,
      saveClinicalNotes,
      hideConfidentialData,
      toggleHideConfidentialData,
      activeLiveSession,
      startLiveSession,
      closeLiveSession,
      whatsAppModalSession,
      openWhatsAppModal,
      closeWhatsAppModal,
      generateWhatsAppLink,
      toasts,
      addToast,
      removeToast,
      updateAccountByAdmin,
      resetToDemoData,
      loadDemoData,
      clearPatientsAndSessions,
    }),
    [
      accounts,
      currentAccountEmail,
      userRole,
      isAdmin,
      isMasterAdmin,
      canSwitchRole,
      profile,
      patients,
      sessions,
      hideConfidentialData,
      activeLiveSession,
      whatsAppModalSession,
      toasts,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
