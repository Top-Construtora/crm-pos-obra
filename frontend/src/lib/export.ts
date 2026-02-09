import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Chamado, CATEGORIA_LABELS, PRIORIDADE_LABELS, STATUS_LABELS } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function exportChamadosListPDF(chamados: Chamado[]) {
  const doc = new jsPDF('landscape')

  doc.setFontSize(18)
  doc.text('Relatorio de Chamados - CRM POS-OBRA', 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(128)
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, 14, 28)
  doc.text(`Total: ${chamados.length} chamados`, 14, 34)

  const tableData = chamados.map((c) => [
    `#${c.numero}`,
    c.clienteNome,
    c.empreendimento?.nome || '-',
    c.unidade,
    CATEGORIA_LABELS[c.categoria],
    PRIORIDADE_LABELS[c.prioridade],
    STATUS_LABELS[c.status],
    c.responsavel?.nome || 'Nao atribuido',
    format(new Date(c.criadoEm), 'dd/MM/yyyy'),
  ])

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Cliente', 'Empreendimento', 'Unidade', 'Categoria', 'Prioridade', 'Status', 'Responsavel', 'Abertura']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [18, 176, 160], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  doc.save(`chamados_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
}

export function exportChamadoDetailPDF(chamado: Chamado) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.text(`Protocolo #${chamado.numero}`, 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(128)
  doc.text(`Empreendimento: ${chamado.empreendimento?.nome || '-'}`, 14, 28)
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, 14, 34)

  doc.setDrawColor(18, 176, 160)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  let y = 46

  // Client info
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text('Dados do Cliente', 14, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(60)
  const clienteInfo = [
    `Nome: ${chamado.clienteNome}`,
    `Telefone: ${chamado.clienteTelefone}`,
    `Email: ${chamado.clienteEmail || '-'}`,
    `Unidade: ${chamado.unidade}`,
    `Tipo: ${chamado.tipo}`,
  ]
  clienteInfo.forEach((line) => {
    doc.text(line, 14, y)
    y += 6
  })

  y += 4

  // Chamado info
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text('Informacoes do Chamado', 14, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(60)
  const chamadoInfo = [
    `Status: ${STATUS_LABELS[chamado.status]}`,
    `Categoria: ${CATEGORIA_LABELS[chamado.categoria]}`,
    `Prioridade: ${PRIORIDADE_LABELS[chamado.prioridade]}`,
    `SLA: ${chamado.slaHoras}h`,
    `Responsavel: ${chamado.responsavel?.nome || 'Nao atribuido'}`,
    `Abertura: ${format(new Date(chamado.criadoEm), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`,
  ]
  chamadoInfo.forEach((line) => {
    doc.text(line, 14, y)
    y += 6
  })

  y += 4

  // Descricao
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text('Descricao do Problema', 14, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(60)
  const descLines = doc.splitTextToSize(chamado.descricao, 178)
  doc.text(descLines, 14, y)
  y += descLines.length * 5 + 4

  // Vistoria
  if (chamado.vistoria) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text('Vistoria Tecnica', 14, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(60)
    const vistoriaInfo = [
      `Data: ${chamado.vistoria.dataVistoria || '-'}`,
      `Horario: ${chamado.vistoria.horaInicio || '-'} - ${chamado.vistoria.horaTermino || '-'}`,
      `Tecnico: ${chamado.vistoria.tecnicoPresente || '-'}`,
    ]
    vistoriaInfo.forEach((line) => {
      doc.text(line, 14, y)
      y += 6
    })

    if (chamado.vistoria.causaIdentificada) {
      y += 2
      doc.text('Causa Identificada:', 14, y)
      y += 5
      const causaLines = doc.splitTextToSize(chamado.vistoria.causaIdentificada, 178)
      doc.text(causaLines, 14, y)
      y += causaLines.length * 5
    }

    if (chamado.vistoria.parecerTecnico) {
      y += 2
      doc.text('Parecer Tecnico:', 14, y)
      y += 5
      const parecerLines = doc.splitTextToSize(chamado.vistoria.parecerTecnico, 178)
      doc.text(parecerLines, 14, y)
      y += parecerLines.length * 5
    }

    y += 4
  }

  // Materiais
  if (chamado.materiais && chamado.materiais.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text('Materiais', 14, y)
    y += 4

    const matData = chamado.materiais.map((m) => [
      m.nome,
      m.quantidade.toString(),
      `R$ ${m.valorUnitario.toFixed(2)}`,
      `R$ ${(m.quantidade * m.valorUnitario).toFixed(2)}`,
      m.aprovado ? 'Sim' : 'Nao',
    ])

    const total = chamado.materiais.reduce((s, m) => s + m.quantidade * m.valorUnitario, 0)

    autoTable(doc, {
      startY: y,
      head: [['Material', 'Qtd', 'Valor Unit.', 'Subtotal', 'Aprovado']],
      body: matData,
      foot: [['', '', 'Total:', `R$ ${total.toFixed(2)}`, '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [18, 176, 160] },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  doc.save(`chamado_${chamado.numero}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

export function exportChamadosExcel(chamados: Chamado[]) {
  const wsData = chamados.map((c) => ({
    'Protocolo': c.numero,
    'Cliente': c.clienteNome,
    'Telefone': c.clienteTelefone,
    'Email': c.clienteEmail || '',
    'Empreendimento': c.empreendimento?.nome || '',
    'Unidade': c.unidade,
    'Tipo': c.tipo,
    'Categoria': CATEGORIA_LABELS[c.categoria],
    'Prioridade': PRIORIDADE_LABELS[c.prioridade],
    'Status': STATUS_LABELS[c.status],
    'SLA (h)': c.slaHoras,
    'Responsavel': c.responsavel?.nome || '',
    'Criado por': c.criadoPor?.nome || '',
    'Data Abertura': format(new Date(c.criadoEm), 'dd/MM/yyyy HH:mm'),
    'Ultima Atualizacao': format(new Date(c.atualizadoEm), 'dd/MM/yyyy HH:mm'),
    'Descricao': c.descricao,
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = [
    { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 25 },
    { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
    { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 50 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Chamados')

  // Stats sheet
  const statsData = [
    { 'Metrica': 'Total de Chamados', 'Valor': chamados.length },
    { 'Metrica': 'Em Aberto', 'Valor': chamados.filter((c) => c.status === 'ABERTO').length },
    { 'Metrica': 'Em Andamento', 'Valor': chamados.filter((c) => c.status === 'EM_ANDAMENTO').length },
    { 'Metrica': 'Aguardando', 'Valor': chamados.filter((c) => c.status === 'AGUARDANDO').length },
    { 'Metrica': 'Finalizados', 'Valor': chamados.filter((c) => c.status === 'FINALIZADO').length },
  ]
  const wsStats = XLSX.utils.json_to_sheet(statsData)
  wsStats['!cols'] = [{ wch: 25 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsStats, 'Resumo')

  XLSX.writeFile(wb, `chamados_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
}
