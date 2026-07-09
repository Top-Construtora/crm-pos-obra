-- =============================================
-- CRM Pos-Obra - Migration para o SCHEMA pos_obra
-- Banco: Supabase da GIO (https://zgfbxlnbkaoqtibtbpcx.supabase.co)
-- =============================================
-- As tabelas operacionais do CRM ficam num schema dedicado (pos_obra),
-- isolado do public da GIO. Os USUARIOS e as OBRAS/EMPREENDIMENTOS vem do
-- public da GIO:
--   * usuarios  -> public.profiles (auth via Supabase Auth da GIO)
--   * obras     -> public.obras_top
-- Por isso NAO ha tabela pos_obra.users nem pos_obra.empreendimentos.
-- As referencias a pessoas/obras sao guardadas como uuid (sem FK cross-schema)
-- e os nomes sao resolvidos pelo backend em profiles/obras_top.
--
-- COMO EXECUTAR:
--   Dashboard da GIO > SQL Editor > New Query > cole e execute.
--
-- PASSOS MANUAIS OBRIGATORIOS (uma vez, no fim):
--   1) Project Settings > API > "Exposed schemas": adicione "pos_obra".
--   2) Crie as permissoes acesso_pos_obra e gerenciar_pos_obra no sistema de
--      permissoes da GIO e atribua aos cargos que devem usar o modulo.
--      (o backend autoriza via public.gio_has_access(...)).
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS pos_obra;

-- =============================================
-- 1. CHAMADOS
--    empreendimento_id / responsavel_id / criado_por_id sao uuid de
--    public.obras_top / public.profiles (sem FK cross-schema).
--    empreendimento_nome e denormalizado (nome da obra no momento).
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.chamados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero INTEGER NOT NULL UNIQUE,
  empreendimento_id UUID NOT NULL,
  empreendimento_nome VARCHAR(200),
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
  responsavel_id UUID,
  criado_por_id UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  horas_estimadas INTEGER,
  equipe_necessaria VARCHAR(100),
  -- Classificacao de conclusao (obrigatoria ao finalizar): CONCLUIDO_REALIZADO,
  -- IMPROCEDENTE_NAO_REALIZADO, IMPROCEDENTE_LIBERALIDADE.
  classificacao VARCHAR(40)
);

-- Sequence para numero do chamado (comeca em 1001)
CREATE SEQUENCE IF NOT EXISTS pos_obra.chamados_numero_seq START WITH 1001;

-- =============================================
-- 2. HISTORICOS
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.historicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES pos_obra.chamados(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  descricao TEXT NOT NULL,
  usuario_id UUID NOT NULL,
  dados_anteriores TEXT,
  dados_novos TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. COMENTARIOS
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES pos_obra.chamados(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  usuario_id UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. VISTORIAS
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.vistorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL UNIQUE REFERENCES pos_obra.chamados(id) ON DELETE CASCADE,
  data_vistoria VARCHAR(10) NOT NULL,
  hora_inicio VARCHAR(5) NOT NULL,
  hora_termino VARCHAR(5),
  tecnico_presente VARCHAR(150) NOT NULL,
  causa_identificada TEXT,
  parecer_tecnico TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 5. MATERIAIS
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES pos_obra.chamados(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario REAL NOT NULL DEFAULT 0,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. ANEXOS
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.anexos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES pos_obra.chamados(id) ON DELETE CASCADE,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tamanho INTEGER NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  usuario_id UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. NOTIFICACOES
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  chamado_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 8. SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 9. AGENDA_TECNICA
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.agenda_tecnica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES pos_obra.chamados(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL,
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
-- 10. MEMBROS (equipe do Pos-Obra)
--     A GIO libera o acesso (acesso_pos_obra); o papel operacional
--     (GESTOR/TECNICO) e definido aqui via tela Equipe Tecnica.
--     Sem registro = TECNICO. Admins da GIO sao sempre gestores.
-- =============================================
CREATE TABLE IF NOT EXISTS pos_obra.membros (
  profile_id UUID PRIMARY KEY,
  role VARCHAR(20) NOT NULL DEFAULT 'TECNICO',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_chamados_empreendimento ON pos_obra.chamados(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_chamados_responsavel ON pos_obra.chamados(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_chamados_criado_por ON pos_obra.chamados(criado_por_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON pos_obra.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_numero ON pos_obra.chamados(numero);
CREATE INDEX IF NOT EXISTS idx_historicos_chamado ON pos_obra.historicos(chamado_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_chamado ON pos_obra.comentarios(chamado_id);
CREATE INDEX IF NOT EXISTS idx_materiais_chamado ON pos_obra.materiais(chamado_id);
CREATE INDEX IF NOT EXISTS idx_anexos_chamado ON pos_obra.anexos(chamado_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON pos_obra.notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON pos_obra.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_agenda_chamado ON pos_obra.agenda_tecnica(chamado_id);
CREATE INDEX IF NOT EXISTS idx_agenda_tecnico ON pos_obra.agenda_tecnica(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_agenda_data ON pos_obra.agenda_tecnica(data_agendamento);

-- =============================================
-- Trigger para atualizar "atualizado_em" automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION pos_obra.update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_chamados_atualizado_em
  BEFORE UPDATE ON pos_obra.chamados FOR EACH ROW EXECUTE FUNCTION pos_obra.update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_settings_atualizado_em
  BEFORE UPDATE ON pos_obra.settings FOR EACH ROW EXECUTE FUNCTION pos_obra.update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_agenda_atualizado_em
  BEFORE UPDATE ON pos_obra.agenda_tecnica FOR EACH ROW EXECUTE FUNCTION pos_obra.update_atualizado_em();

CREATE OR REPLACE TRIGGER trg_membros_atualizado_em
  BEFORE UPDATE ON pos_obra.membros FOR EACH ROW EXECUTE FUNCTION pos_obra.update_atualizado_em();

-- =============================================
-- Dados iniciais (Settings padrao)
-- =============================================
INSERT INTO pos_obra.settings (chave, valor) VALUES
  ('sla_padrao', '48'),
  ('categorias_ativas', 'HIDRAULICA,ELETRICA,PINTURA,ESQUADRIAS,IMPERMEABILIZACAO,ESTRUTURAL,OUTROS'),
  ('email_habilitado', 'false'),
  ('nome_sistema', 'CRM Pos-Obra')
ON CONFLICT (chave) DO NOTHING;

-- =============================================
-- GRANTS para o PostgREST (roles anon/authenticated)
-- O backend usa a anon key para os dados; a autorizacao real e feita no
-- Express (JWT do Supabase + gio_has_access).
-- =============================================
GRANT USAGE ON SCHEMA pos_obra TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pos_obra TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pos_obra TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA pos_obra TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA pos_obra
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos_obra
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- =============================================
-- RLS (Row Level Security)
-- Policies permissivas: o backend (anon key) acessa tudo; a seguranca de fato
-- vem do JWT do Supabase + gio_has_access no Express.
-- =============================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'chamados','historicos','comentarios','vistorias','materiais',
    'anexos','notificacoes','settings','agenda_tecnica','membros'
  ]
  LOOP
    EXECUTE format('ALTER TABLE pos_obra.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON pos_obra.%I;', t);
    EXECUTE format(
      'CREATE POLICY "Allow all for anon" ON pos_obra.%I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;
