-- =============================================
-- CRM Pos-Obra - Migration Script para Supabase
-- Banco: https://bxtlikndqywohhmxohaw.supabase.co
-- =============================================
-- Execute este script no SQL Editor do Supabase:
-- Dashboard > SQL Editor > New Query > Cole e execute

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'TECNICO',
  ativo BOOLEAN NOT NULL DEFAULT true,
  avatar VARCHAR(255),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 2. EMPREENDIMENTOS
-- =============================================
CREATE TABLE IF NOT EXISTS empreendimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(200) NOT NULL,
  endereco VARCHAR(500) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. CHAMADOS
-- =============================================
CREATE TABLE IF NOT EXISTS chamados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero INTEGER NOT NULL UNIQUE,
  empreendimento_id UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  unidade VARCHAR(50) NOT NULL,
  cliente_nome VARCHAR(150) NOT NULL,
  cliente_telefone VARCHAR(20) NOT NULL,
  cliente_email VARCHAR(100),
  tipo VARCHAR(20) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  descricao TEXT NOT NULL,
  prioridade VARCHAR(20) NOT NULL,
  sla_horas INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ABERTO',
  responsavel_id UUID REFERENCES users(id) ON DELETE SET NULL,
  criado_por_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  horas_estimadas INTEGER,
  equipe_necessaria VARCHAR(100)
);

-- Sequence para numero do chamado (começa em 1001)
CREATE SEQUENCE IF NOT EXISTS chamados_numero_seq START WITH 1001;

-- =============================================
-- 4. HISTORICOS
-- =============================================
CREATE TABLE IF NOT EXISTS historicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  descricao TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dados_anteriores TEXT,
  dados_novos TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 5. COMENTARIOS
-- =============================================
CREATE TABLE IF NOT EXISTS comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. VISTORIAS
-- =============================================
CREATE TABLE IF NOT EXISTS vistorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL UNIQUE REFERENCES chamados(id) ON DELETE CASCADE,
  data_vistoria VARCHAR(10) NOT NULL,
  hora_inicio VARCHAR(5) NOT NULL,
  hora_termino VARCHAR(5),
  tecnico_presente VARCHAR(150) NOT NULL,
  causa_identificada TEXT,
  parecer_tecnico TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. MATERIAIS
-- =============================================
CREATE TABLE IF NOT EXISTS materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario REAL NOT NULL DEFAULT 0,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 8. ANEXOS
-- =============================================
CREATE TABLE IF NOT EXISTS anexos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tamanho INTEGER NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 9. NOTIFICACOES
-- =============================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  chamado_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 10. SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 11. AGENDA_TECNICA
-- =============================================
CREATE TABLE IF NOT EXISTS agenda_tecnica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_agendamento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'AGENDADO',
  observacoes TEXT,
  ordem_roteiro INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  inicio_atendimento TIMESTAMPTZ,
  fim_atendimento TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_chamados_empreendimento ON chamados(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_chamados_responsavel ON chamados(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chamados_criado_por ON chamados(criado_por_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_numero ON chamados(numero);
CREATE INDEX IF NOT EXISTS idx_historicos_chamado ON historicos(chamado_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_chamado ON comentarios(chamado_id);
CREATE INDEX IF NOT EXISTS idx_materiais_chamado ON materiais(chamado_id);
CREATE INDEX IF NOT EXISTS idx_anexos_chamado ON anexos(chamado_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_agenda_chamado ON agenda_tecnica(chamado_id);
CREATE INDEX IF NOT EXISTS idx_agenda_tecnico ON agenda_tecnica(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_agenda_data ON agenda_tecnica(data_agendamento);

-- =============================================
-- Trigger para atualizar "atualizado_em" automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_atualizado_em
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_empreendimentos_atualizado_em
  BEFORE UPDATE ON empreendimentos FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_chamados_atualizado_em
  BEFORE UPDATE ON chamados FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_settings_atualizado_em
  BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_agenda_atualizado_em
  BEFORE UPDATE ON agenda_tecnica FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- =============================================
-- Dados iniciais (Settings padrão)
-- =============================================
INSERT INTO settings (chave, valor) VALUES
  ('sla_padrao', '48'),
  ('categorias_ativas', 'HIDRAULICA,ELETRICA,PINTURA,ESQUADRIAS,IMPERMEABILIZACAO,ESTRUTURAL,OUTROS'),
  ('email_habilitado', 'false'),
  ('nome_sistema', 'CRM Pos-Obra')
ON CONFLICT (chave) DO NOTHING;

-- =============================================
-- RLS (Row Level Security) - Desabilitado por padrão
-- O backend usa a anon key com service role quando necessário
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE empreendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE historicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vistorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_tecnica ENABLE ROW LEVEL SECURITY;

-- Policies permissivas para o backend (anon key pode acessar tudo)
-- Ajuste conforme necessidade de segurança
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON empreendimentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON chamados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON historicos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON comentarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON vistorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON materiais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON anexos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notificacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON agenda_tecnica FOR ALL USING (true) WITH CHECK (true);
