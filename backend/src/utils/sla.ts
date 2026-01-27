import { Chamado } from '../entities/Chamado.js';

export type SLAStatus = 'NO_PRAZO' | 'PROXIMO_VENCIMENTO' | 'VENCIDO';

export interface SLAInfo {
  status: SLAStatus;
  tempoRestante: number; // em minutos
  percentualUsado: number;
  dataLimite: Date;
}

export function calcularSLA(chamado: Chamado): SLAInfo {
  // Se já está finalizado, retorna no prazo
  if (chamado.status === 'FINALIZADO') {
    return {
      status: 'NO_PRAZO',
      tempoRestante: 0,
      percentualUsado: 100,
      dataLimite: chamado.finalizadoEm || new Date(),
    };
  }

  const criadoEm = new Date(chamado.criadoEm);
  const dataLimite = new Date(criadoEm.getTime() + chamado.slaHoras * 60 * 60 * 1000);
  const agora = new Date();

  const tempoRestanteMs = dataLimite.getTime() - agora.getTime();
  const tempoRestante = Math.floor(tempoRestanteMs / (1000 * 60)); // em minutos

  const tempoTotalMs = chamado.slaHoras * 60 * 60 * 1000;
  const tempoUsadoMs = agora.getTime() - criadoEm.getTime();
  const percentualUsado = Math.min((tempoUsadoMs / tempoTotalMs) * 100, 100);

  let status: SLAStatus;
  if (tempoRestante <= 0) {
    status = 'VENCIDO';
  } else if (percentualUsado >= 75) {
    status = 'PROXIMO_VENCIMENTO';
  } else {
    status = 'NO_PRAZO';
  }

  return { status, tempoRestante, percentualUsado, dataLimite };
}

export function formatarTempoRestante(minutos: number): string {
  if (minutos <= 0) {
    const minutosAbs = Math.abs(minutos);
    if (minutosAbs < 60) {
      return `Vencido há ${minutosAbs} min`;
    }
    const horas = Math.floor(minutosAbs / 60);
    if (horas < 24) {
      return `Vencido há ${horas}h`;
    }
    const dias = Math.floor(horas / 24);
    return `Vencido há ${dias}d`;
  }

  if (minutos < 60) {
    return `${minutos} min restantes`;
  }

  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    return `${horas}h restantes`;
  }

  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  if (horasRestantes > 0) {
    return `${dias}d ${horasRestantes}h restantes`;
  }
  return `${dias}d restantes`;
}
