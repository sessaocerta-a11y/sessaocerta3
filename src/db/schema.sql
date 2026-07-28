-- ====================================================================
-- SESSÃO CERTA — DATABASE SCHEMA & RLS POLICIES (POSTGRESQL / SUPABASE)
-- CAPÍTULO 9 & 10: MODELAGEM DE BANCO DE DADOS E ARQUITETURA
-- ====================================================================

-- ENUM DEFINITIONS
CREATE TYPE appointment_status_enum AS ENUM (
  'scheduled',
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancelled_by_patient',
  'cancelled_by_psychologist',
  'reschedule_requested',
  'no_show'
);

CREATE TYPE reminder_status_enum AS ENUM (
  'scheduled',
  'processing',
  'sent',
  'delivered',
  'read',
  'failed',
  'cancelled'
);

CREATE TYPE attendance_type_enum AS ENUM (
  'online',
  'presencial',
  'hibrido'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pago',
  'pendente',
  'isento'
);

-- 1. TABELA USERS (Profissional / Psicólogo)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT NOT NULL,
  crp TEXT,
  especialidade TEXT,
  foto_url TEXT,
  clinic_address TEXT,
  pix_key TEXT,
  duracao_padrao INT DEFAULT 50,
  preco_padrao NUMERIC(10, 2) DEFAULT 200.00,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA PATIENTS (Pacientes)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  telefone TEXT,
  whatsapp TEXT NOT NULL,
  email TEXT,
  nome_contato_emergencia TEXT,
  telefone_contato_emergencia TEXT,
  observacoes_administrativas TEXT, -- Apenas dados administrativos (sem prontuário clínico)
  status TEXT DEFAULT 'ativo', -- 'ativo', 'pausa', 'alta'
  attendance_type attendance_type_enum DEFAULT 'presencial',
  session_price NUMERIC(10, 2) DEFAULT 200.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. TABELA APPOINTMENT_SERIES (Séries de Agendamento Recorrente - Plano de Atendimento)
CREATE TABLE appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL, -- 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  duracao_minutos INT DEFAULT 50,
  frequencia TEXT DEFAULT 'semanal', -- 'semanal', 'quinzenal'
  modalidade attendance_type_enum DEFAULT 'presencial',
  valor NUMERIC(10, 2) DEFAULT 200.00,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA APPOINTMENTS (Sessões)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  series_id UUID REFERENCES appointment_series(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  duracao_minutos INT NOT NULL DEFAULT 50,
  modalidade attendance_type_enum DEFAULT 'presencial',
  video_url TEXT,
  valor NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
  status appointment_status_enum DEFAULT 'scheduled',
  payment_status payment_status_enum DEFAULT 'pendente',
  token_confirmacao TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  token_reagendamento TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  clinical_notes TEXT, -- Prontuário / Evolução da sessão (criptografado no ambiente seguro)
  mood_rating INT, -- 1 a 5
  homework TEXT,
  whatsapp_reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. TABELA REMINDERS (Fila de Lembretes Automáticos de WhatsApp)
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- '24h_before', '2h_before', 'manual'
  status reminder_status_enum DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  attempt_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA NOTIFICATIONS (Notificações do Sistema para o Psicólogo)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT DEFAULT 'confirmation', -- 'confirmation', 'reschedule', 'cancellation', 'reminder'
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA WEBHOOK_LOGS (Log de chamadas do WhatsApp / Meta Cloud API)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'whatsapp_cloud_api',
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'processed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA MESSAGE_HISTORY (Histórico de Mensagens Enviadas)
CREATE TABLE message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'whatsapp_api',
  conteudo TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA SETTINGS (Configurações do Consultório)
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  dias_atendimento INT[] DEFAULT '{1,2,3,4,5}',
  mensagem_padrao_24h TEXT DEFAULT 'Olá {nome} 👋 Lembrando da sua sessão amanhã às {horario}.',
  mensagem_padrao_2h TEXT DEFAULT 'Olá {nome} 👋 Sua sessão começa em 2 horas ({horario}).',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_nome ON patients(nome);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_data ON appointments(data);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_tokens ON appointments(token_confirmacao, token_reagendamento);
CREATE INDEX idx_reminders_status_scheduled ON reminders(status, scheduled_at);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own user profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can access own patients" ON patients
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own appointment series" ON appointment_series
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own appointments" ON appointments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);
