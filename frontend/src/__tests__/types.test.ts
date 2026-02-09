import { describe, it, expect } from 'vitest';
import {
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  CATEGORIA_LABELS,
  TIPO_LABELS,
  ROLE_LABELS,
  SLA_STATUS_LABELS,
} from '../types/index';

describe('Types - Labels', () => {
  it('STATUS_LABELS deve ter todos os status', () => {
    expect(STATUS_LABELS.ABERTO).toBe('Em Aberto');
    expect(STATUS_LABELS.EM_ANDAMENTO).toBe('Em Andamento');
    expect(STATUS_LABELS.AGUARDANDO).toBe('Aguardando');
    expect(STATUS_LABELS.FINALIZADO).toBe('Finalizado');
    expect(Object.keys(STATUS_LABELS)).toHaveLength(4);
  });

  it('PRIORIDADE_LABELS deve ter todas as prioridades', () => {
    expect(PRIORIDADE_LABELS.BAIXA).toBe('Baixa');
    expect(PRIORIDADE_LABELS.MEDIA).toBe('Média');
    expect(PRIORIDADE_LABELS.ALTA).toBe('Alta');
    expect(PRIORIDADE_LABELS.URGENTE).toBe('Urgente');
    expect(Object.keys(PRIORIDADE_LABELS)).toHaveLength(4);
  });

  it('CATEGORIA_LABELS deve ter todas as categorias', () => {
    expect(CATEGORIA_LABELS.HIDRAULICA).toBe('Hidráulica');
    expect(CATEGORIA_LABELS.ELETRICA).toBe('Elétrica');
    expect(CATEGORIA_LABELS.PINTURA).toBe('Pintura');
    expect(CATEGORIA_LABELS.ESQUADRIAS).toBe('Esquadrias');
    expect(CATEGORIA_LABELS.IMPERMEABILIZACAO).toBe('Impermeabilização');
    expect(CATEGORIA_LABELS.ESTRUTURAL).toBe('Estrutural');
    expect(CATEGORIA_LABELS.OUTROS).toBe('Outros');
    expect(Object.keys(CATEGORIA_LABELS)).toHaveLength(7);
  });

  it('TIPO_LABELS deve ter todos os tipos', () => {
    expect(TIPO_LABELS.RESIDENCIAL).toBe('Residencial');
    expect(TIPO_LABELS.COMERCIAL).toBe('Comercial');
    expect(Object.keys(TIPO_LABELS)).toHaveLength(2);
  });

  it('ROLE_LABELS deve ter todos os roles', () => {
    expect(ROLE_LABELS.ADMIN).toBe('Administrador');
    expect(ROLE_LABELS.COORDENADOR).toBe('Coordenador');
    expect(ROLE_LABELS.TECNICO).toBe('Técnico');
    expect(Object.keys(ROLE_LABELS)).toHaveLength(3);
  });

  it('SLA_STATUS_LABELS deve ter todos os status SLA', () => {
    expect(SLA_STATUS_LABELS.NO_PRAZO).toBe('No Prazo');
    expect(SLA_STATUS_LABELS.PROXIMO_VENCIMENTO).toBe('Próximo do Vencimento');
    expect(SLA_STATUS_LABELS.VENCIDO).toBe('Vencido');
    expect(Object.keys(SLA_STATUS_LABELS)).toHaveLength(3);
  });
});
