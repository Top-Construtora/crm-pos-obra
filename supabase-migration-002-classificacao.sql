-- =============================================
-- CRM Pos-Obra - Migration incremental 002
-- Classificacao de conclusao do chamado
-- =============================================
-- Rode no SQL Editor do Supabase da GIO (schema pos_obra).
-- Valores esperados (definidos pela app):
--   CONCLUIDO_REALIZADO, IMPROCEDENTE_NAO_REALIZADO, IMPROCEDENTE_LIBERALIDADE
-- Obrigatoria ao finalizar (validado no backend).
-- =============================================

ALTER TABLE pos_obra.chamados
  ADD COLUMN IF NOT EXISTS classificacao VARCHAR(40);
