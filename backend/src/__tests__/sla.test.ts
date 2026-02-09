import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcularSLA, formatarTempoRestante } from '../utils/sla.js';
import { Chamado } from '../entities/Chamado.js';

function criarChamadoMock(overrides: Partial<Chamado> = {}): Chamado {
  return {
    id: '1',
    numero: 1001,
    empreendimentoId: 'emp-1',
    unidade: '101',
    clienteNome: 'Teste',
    clienteTelefone: '11999999999',
    tipo: 'RESIDENCIAL',
    categoria: 'HIDRAULICA',
    descricao: 'Teste',
    prioridade: 'MEDIA',
    slaHoras: 24,
    status: 'ABERTO',
    responsavelId: null,
    criadoPorId: 'user-1',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  } as Chamado;
}

describe('calcularSLA', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve retornar NO_PRAZO para chamado recente', () => {
    const agora = new Date('2025-01-10T10:00:00Z');
    vi.setSystemTime(agora);

    const chamado = criarChamadoMock({
      criadoEm: new Date('2025-01-10T08:00:00Z'), // 2h atras, SLA 24h
      slaHoras: 24,
    });

    const sla = calcularSLA(chamado);
    expect(sla.status).toBe('NO_PRAZO');
    expect(sla.tempoRestante).toBeGreaterThan(0);
    expect(sla.percentualUsado).toBeLessThan(75);
  });

  it('deve retornar PROXIMO_VENCIMENTO quando >= 75% usado', () => {
    const agora = new Date('2025-01-10T22:00:00Z');
    vi.setSystemTime(agora);

    const chamado = criarChamadoMock({
      criadoEm: new Date('2025-01-10T02:00:00Z'), // 20h atras, SLA 24h = 83%
      slaHoras: 24,
    });

    const sla = calcularSLA(chamado);
    expect(sla.status).toBe('PROXIMO_VENCIMENTO');
    expect(sla.percentualUsado).toBeGreaterThanOrEqual(75);
  });

  it('deve retornar VENCIDO quando tempo esgotado', () => {
    const agora = new Date('2025-01-12T10:00:00Z');
    vi.setSystemTime(agora);

    const chamado = criarChamadoMock({
      criadoEm: new Date('2025-01-10T08:00:00Z'), // 50h atras, SLA 24h
      slaHoras: 24,
    });

    const sla = calcularSLA(chamado);
    expect(sla.status).toBe('VENCIDO');
    expect(sla.tempoRestante).toBeLessThanOrEqual(0);
  });

  it('deve retornar NO_PRAZO para chamado FINALIZADO', () => {
    const chamado = criarChamadoMock({
      status: 'FINALIZADO',
      finalizadoEm: new Date('2025-01-10T12:00:00Z'),
    });

    const sla = calcularSLA(chamado);
    expect(sla.status).toBe('NO_PRAZO');
    expect(sla.percentualUsado).toBe(100);
  });

  it('deve calcular dataLimite corretamente', () => {
    const agora = new Date('2025-01-10T10:00:00Z');
    vi.setSystemTime(agora);

    const criadoEm = new Date('2025-01-10T08:00:00Z');
    const chamado = criarChamadoMock({
      criadoEm,
      slaHoras: 48,
    });

    const sla = calcularSLA(chamado);
    const esperado = new Date(criadoEm.getTime() + 48 * 60 * 60 * 1000);
    expect(sla.dataLimite.getTime()).toBe(esperado.getTime());
  });
});

describe('formatarTempoRestante', () => {
  it('deve formatar minutos restantes', () => {
    expect(formatarTempoRestante(30)).toBe('30 min restantes');
  });

  it('deve formatar horas restantes', () => {
    expect(formatarTempoRestante(120)).toBe('2h restantes');
  });

  it('deve formatar dias e horas restantes', () => {
    expect(formatarTempoRestante(1500)).toBe('1d 1h restantes');
  });

  it('deve formatar apenas dias quando sem horas extras', () => {
    expect(formatarTempoRestante(1440)).toBe('1d restantes');
  });

  it('deve formatar vencido em minutos', () => {
    expect(formatarTempoRestante(-30)).toBe('Vencido há 30 min');
  });

  it('deve formatar vencido em horas', () => {
    expect(formatarTempoRestante(-120)).toBe('Vencido há 2h');
  });

  it('deve formatar vencido em dias', () => {
    expect(formatarTempoRestante(-1500)).toBe('Vencido há 1d');
  });
});
