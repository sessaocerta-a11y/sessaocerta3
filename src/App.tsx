import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NavTab, Sidebar } from './components/Navigation/Sidebar';
import { Navbar } from './components/Navigation/Navbar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { PatientsView } from './components/Patients/PatientsView';
import { PatientFormModal } from './components/Patients/PatientFormModal';
import { ScheduleView } from './components/Schedule/ScheduleView';
import { SessionFormModal } from './components/Schedule/SessionFormModal';
import { SessionsView } from './components/Sessions/SessionsView';
import { LiveSessionModal } from './components/Sessions/LiveSessionModal';
import { WhatsAppRemindersView } from './components/WhatsAppReminders/WhatsAppRemindersView';
import { SessaoCertaConnectView } from './components/Connect/SessaoCertaConnectView';
import { SettingsView } from './components/Settings/SettingsView';
import { AdminView } from './components/Admin/AdminView';
import { LandingPageView } from './components/LandingPage/LandingPageView';
import { OnboardingWizardModal } from './components/Onboarding/OnboardingWizardModal';
import { AuthModal } from './components/Auth/AuthModal';
import { PatientConfirmationModal } from './components/PatientPortal/PatientConfirmationModal';
import { ToastContainer } from './components/Common/Toast';
import { CopilotWidget } from './components/AI/CopilotWidget';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { ProfileModal } from './components/Profile/ProfileModal';
import { Patient, Session } from './types';

function MainAppContent({
  onGoToLanding,
  autoOpenOnboarding = false
}: {
  onGoToLanding: () => void;
  autoOpenOnboarding?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Modals state
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);

  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  const [sessionPresetDate, setSessionPresetDate] = useState<string | undefined>(undefined);
  const [sessionPresetTime, setSessionPresetTime] = useState<string | undefined>(undefined);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(autoOpenOnboarding);
  const [patientPortalSession, setPatientPortalSession] = useState<Session | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { activeLiveSession, closeLiveSession, addToast, isAdmin, setUserRole, canSwitchRole, logoutAccount } = useApp();

  // Redirecionamento automático de painel baseado na Role do usuário autenticado (RBAC)
  React.useEffect(() => {
    if (isAdmin) {
      setActiveTab('admin');
    } else if (activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  }, [isAdmin]);

  // Listener para troca de abas via assistente Clara
  React.useEffect(() => {
    const handleSwitchTab = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-tab', handleSwitchTab);
  }, []);

  const handleLogout = () => {
    logoutAccount();
    onGoToLanding();
  };

  const handleClosePatientModal = () => {
    setIsNewPatientModalOpen(false);
    setActiveTab('dashboard');
  };

  const handleCloseSessionModal = () => {
    console.log('[App AUDIT] handleCloseSessionModal executed -> setting isNewSessionModalOpen = false');
    setIsNewSessionModalOpen(false);
  };

  const handleOpenNewPatient = () => {
    console.log('[App AUDIT] handleOpenNewPatient executed');
    setPatientToEdit(null);
    setIsNewPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    console.log('[App AUDIT] handleEditPatient executed for:', patient.name);
    setPatientToEdit(patient);
    setIsNewPatientModalOpen(true);
  };

  const handleOpenNewSession = (date?: any, time?: any) => {
    const cleanDate = typeof date === 'string' ? date : undefined;
    const cleanTime = typeof time === 'string' ? time : undefined;
    console.log('[App AUDIT] handleOpenNewSession executed -> setting isNewSessionModalOpen = true, date:', cleanDate, 'time:', cleanTime);
    setSessionToEdit(null);
    setSessionPresetDate(cleanDate);
    setSessionPresetTime(cleanTime);
    setIsNewSessionModalOpen(true);
  };

  const handleEditSession = (session: Session) => {
    console.log('[App AUDIT] handleEditSession executed for session:', session.id);
    setSessionToEdit(session);
    setIsNewSessionModalOpen(true);
  };

  const handleSimulatePatientPortal = (session: Session) => {
    setPatientPortalSession(session);
  };

  const handleSidebarTabSelect = (tab: NavTab) => {
    if (tab === 'landing') {
      onGoToLanding();
    } else if (tab === 'admin' && !isAdmin) {
      addToast('Acesso Restrito (403): O Painel Admin é exclusivo para Administradores do SaaS.', 'warning');
      setActiveTab('dashboard');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenNewSessionModal={handleOpenNewSession}
        onOpenNewPatientModal={handleOpenNewPatient}
        onToggleSidebarMobile={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
        onGoToLanding={onGoToLanding}
        onLogout={handleLogout}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        activeTab={activeTab}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSidebarTabSelect}
          isMobileOpen={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
          onLogout={handleLogout}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />

        {/* Main View Container */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNewSession={handleOpenNewSession}
              onOpenNewPatient={handleOpenNewPatient}
              onGoToSchedule={() => setActiveTab('schedule')}
              onGoToPatients={() => setActiveTab('patients')}
              onGoToReminders={() => setActiveTab('reminders')}
              onGoToFinance={() => setActiveTab('sessions')}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSimulatePatientLink={handleSimulatePatientPortal}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView
              onOpenNewSession={handleOpenNewSession}
              onEditSession={handleEditSession}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              onOpenNewPatientModal={handleOpenNewPatient}
              onEditPatientModal={handleEditPatient}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsView
              onOpenLiveSession={(session) => handleEditSession(session)}
            />
          )}

          {activeTab === 'reminders' && (
            <WhatsAppRemindersView
              onSimulatePatientLink={handleSimulatePatientPortal}
            />
          )}

          {activeTab === 'connect' && <SessaoCertaConnectView />}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'admin' && (
            isAdmin ? (
              <AdminView />
            ) : (
              <div className="p-8 rounded-3xl bg-slate-900 border border-rose-500/30 text-center space-y-4 my-8 max-w-2xl mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-2xl font-black">403</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white">Acesso Restrito ao Painel Admin SaaS</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Seu perfil atual de acesso é <strong>Psicólogo (Usuário Comum)</strong>. De acordo com a arquitetura de controle de acesso (RBAC), você visualiza apenas os dados e a agenda do seu próprio consultório.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
                  <div className="font-bold text-slate-200">Regras de Acesso Aplicadas (RBAC):</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li>Psicólogos: Acesso restrito a pacientes, sessões, prontuários e receitas do seu consultório.</li>
                    <li>Administradores: Acesso ao Painel Admin SaaS, métricas globais de faturamento, monitoramento de servidores e esquemas DDL do banco de dados.</li>
                  </ul>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
                  >
                    Voltar ao Meu Consultório
                  </button>
                  {canSwitchRole && (
                    <button
                      onClick={() => {
                        setUserRole('admin');
                        addToast('Modo Administrador ativado! Acesso ao Painel Admin liberado.', 'success');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Alternar para Perfil Admin
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleSidebarTabSelect}
        onToggleMobileSidebar={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
      />

      {/* Patient Form Modal */}
      <PatientFormModal
        isOpen={isNewPatientModalOpen}
        onClose={handleClosePatientModal}
        patientToEdit={patientToEdit}
      />

      {/* Session Form Modal */}
      <SessionFormModal
        isOpen={isNewSessionModalOpen}
        onClose={handleCloseSessionModal}
        sessionToEdit={sessionToEdit}
        initialDate={sessionPresetDate}
        initialTime={sessionPresetTime}
        onOpenNewPatient={handleOpenNewPatient}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOpenNewPatient={handleOpenNewPatient}
        onOpenNewSession={handleOpenNewSession}
      />

      {/* Patient Confirmation Portal Simulator */}
      <PatientConfirmationModal
        isOpen={!!patientPortalSession}
        onClose={() => setPatientPortalSession(null)}
        session={patientPortalSession}
      />

      {/* Active Live Consultation Modal */}
      {activeLiveSession && (
        <LiveSessionModal
          session={activeLiveSession}
          onClose={closeLiveSession}
        />
      )}

      {/* Professional Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Floating AI Copilot Widget */}
      <CopilotWidget />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [shouldAutoOpenOnboarding, setShouldAutoOpenOnboarding] = useState(false);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleSuccessAuth = () => {
    setIsAuthOpen(false);
    if (authMode === 'register') {
      setShouldAutoOpenOnboarding(true);
    }
    setViewMode('app');
  };

  return (
    <AppProvider>
      {viewMode === 'landing' ? (
        <>
          <LandingPageView
            onStartFreeTrial={() => handleOpenAuth('register')}
            onLogin={() => handleOpenAuth('login')}
            onOpenOnboarding={() => {
              setShouldAutoOpenOnboarding(true);
              setViewMode('app');
            }}
          />
          <AuthModal
            isOpen={isAuthOpen}
            initialMode={authMode}
            onClose={() => setIsAuthOpen(false)}
            onSuccessAuth={handleSuccessAuth}
          />
        </>
      ) : (
        <MainAppContent
          onGoToLanding={() => setViewMode('landing')}
          autoOpenOnboarding={shouldAutoOpenOnboarding}
        />
      )}
    </AppProvider>
  );
}
