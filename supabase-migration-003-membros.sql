-- =============================================
-- CRM Pos-Obra - Migration incremental 003
-- Equipe do Pos-Obra: papel (GESTOR/TECNICO) por usuario da GIO
-- =============================================
-- Rode no SQL Editor do Supabase da GIO (schema pos_obra).
--
-- Modelo: a GIO libera o acesso (permissao acesso_pos_obra); o papel
-- operacional dentro do Pos-Obra e definido aqui, na tela Equipe Tecnica.
-- Sem registro nesta tabela = TECNICO (padrao). Admins da GIO sao sempre
-- gestores (short-circuit no backend) e nao aparecem na tela.
-- =============================================

CREATE TABLE IF NOT EXISTS pos_obra.membros (
  profile_id UUID PRIMARY KEY,          -- public.profiles.id (sem FK cross-schema)
  role VARCHAR(20) NOT NULL DEFAULT 'TECNICO',  -- GESTOR | TECNICO
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_membros_atualizado_em
  BEFORE UPDATE ON pos_obra.membros FOR EACH ROW EXECUTE FUNCTION pos_obra.update_atualizado_em();

-- Grants ja cobertos pelos DEFAULT PRIVILEGES do schema; garante mesmo assim.
GRANT ALL ON pos_obra.membros TO anon, authenticated, service_role;

ALTER TABLE pos_obra.membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON pos_obra.membros;
CREATE POLICY "Allow all for anon" ON pos_obra.membros FOR ALL USING (true) WITH CHECK (true);
