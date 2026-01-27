import { addHours, differenceInMinutes, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Chamado, SLAStatus, SLAInfo } from '@/types'

export function calcularSLA(chamado: Chamado): SLAInfo {
  // Se já está finalizado, retorna no prazo
  if (chamado.status === 'FINALIZADO') {
    return {
      status: 'NO_PRAZO',
      tempoRestante: 0,
      percentualUsado: 100,
      dataLimite: chamado.finalizadoEm ? new Date(chamado.finalizadoEm) : new Date(),
    }
  }

  const criadoEm = new Date(chamado.criadoEm)
  const dataLimite = addHours(criadoEm, chamado.slaHoras)
  const agora = new Date()

  const tempoRestante = differenceInMinutes(dataLimite, agora)
  const tempoTotal = chamado.slaHoras * 60 // em minutos
  const tempoUsado = tempoTotal - tempoRestante
  const percentualUsado = Math.min((tempoUsado / tempoTotal) * 100, 100)

  let status: SLAStatus
  if (tempoRestante <= 0) {
    status = 'VENCIDO'
  } else if (percentualUsado >= 75) {
    status = 'PROXIMO_VENCIMENTO'
  } else {
    status = 'NO_PRAZO'
  }

  return { status, tempoRestante, percentualUsado, dataLimite }
}

export function formatarTempoRestante(minutos: number): string {
  if (minutos <= 0) {
    const minutosAbs = Math.abs(minutos)
    if (minutosAbs < 60) {
      return `Vencido ha ${minutosAbs} min`
    }
    const horas = Math.floor(minutosAbs / 60)
    if (horas < 24) {
      return `Vencido ha ${horas}h`
    }
    const dias = Math.floor(horas / 24)
    return `Vencido ha ${dias}d`
  }

  if (minutos < 60) {
    return `${minutos} min restantes`
  }

  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    return `${horas}h restantes`
  }

  const dias = Math.floor(horas / 24)
  const horasRestantes = horas % 24
  if (horasRestantes > 0) {
    return `${dias}d ${horasRestantes}h restantes`
  }
  return `${dias}d restantes`
}

export function getSlaStatusLabel(status: SLAStatus): string {
  switch (status) {
    case 'VENCIDO':
      return 'Vencido'
    case 'PROXIMO_VENCIMENTO':
      return 'Proximo do Vencimento'
    case 'NO_PRAZO':
      return 'No Prazo'
    default:
      return status
  }
}

export function getSlaStatusColor(status: SLAStatus): string {
  switch (status) {
    case 'VENCIDO':
      return 'bg-red-500'
    case 'PROXIMO_VENCIMENTO':
      return 'bg-yellow-500'
    case 'NO_PRAZO':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

export function formatDataRelativa(data: string | Date): string {
  return formatDistanceToNow(new Date(data), {
    addSuffix: true,
    locale: ptBR,
  })
}
