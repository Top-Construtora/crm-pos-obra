import { supabase, supabaseGio, supabaseGioAdmin } from '../config/supabase.js';
import { getIO } from '../socket.js';
import { toCamel } from './db.js';
import { sendNewChamadoEmail, sendStatusChangeEmail, sendSlaAlertEmail } from '../services/email.service.js';

export async function criarNotificacao(params: {
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  chamadoId?: string;
  emailData?: {
    chamadoNumero?: number;
    descricao?: string;
    statusAnterior?: string;
    statusNovo?: string;
    horasRestantes?: number;
  };
}): Promise<any> {
  const { emailData, ...notifParams } = params;

  const { data: saved, error } = await supabase
    .from('notificacoes')
    .insert({
      usuario_id: notifParams.usuarioId,
      tipo: notifParams.tipo,
      titulo: notifParams.titulo,
      mensagem: notifParams.mensagem,
      chamado_id: notifParams.chamadoId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar notificacao:', error);
    throw error;
  }

  const notificacao = toCamel(saved);

  // Emit via socket to the target user
  const io = getIO();
  if (io) {
    io.to(`user:${params.usuarioId}`).emit('notificacao:new', notificacao);
  }

  // Send email notification (async, non-blocking)
  sendEmailForNotification(params.usuarioId, params.tipo, emailData).catch((err) => {
    console.error('[Notificacao] Erro ao enviar email:', err);
  });

  return notificacao;
}

async function sendEmailForNotification(
  usuarioId: string,
  tipo: string,
  emailData?: {
    chamadoNumero?: number;
    descricao?: string;
    statusAnterior?: string;
    statusNovo?: string;
    horasRestantes?: number;
  },
): Promise<void> {
  const clientGio = supabaseGioAdmin || supabaseGio;
  if (!emailData || !clientGio) return;

  // Email vem de public.profiles (GIO). Nem todo profile tem coluna/valor de
  // email; nesse caso apenas nao enviamos (best-effort, ja gated por settings).
  const { data: user } = await clientGio
    .from('profiles')
    .select('*')
    .eq('id', usuarioId)
    .single();

  const email = (user as any)?.email;
  if (!email) return;

  const { chamadoNumero, descricao, statusAnterior, statusNovo, horasRestantes } = emailData;

  if (tipo === 'ATRIBUICAO' && chamadoNumero && descricao) {
    await sendNewChamadoEmail(email, chamadoNumero, descricao);
  } else if (tipo === 'STATUS_ALTERADO' && chamadoNumero && statusAnterior && statusNovo) {
    await sendStatusChangeEmail(email, chamadoNumero, statusAnterior, statusNovo);
  } else if (tipo === 'SLA_ALERTA' && chamadoNumero && horasRestantes !== undefined) {
    await sendSlaAlertEmail(email, chamadoNumero, horasRestantes);
  }
}

export async function criarNotificacoes(
  usuarioIds: string[],
  params: { tipo: string; titulo: string; mensagem: string; chamadoId?: string }
): Promise<any[]> {
  const uniqueIds = [...new Set(usuarioIds)];

  const rows = uniqueIds.map((usuarioId) => ({
    usuario_id: usuarioId,
    tipo: params.tipo,
    titulo: params.titulo,
    mensagem: params.mensagem,
    chamado_id: params.chamadoId || null,
  }));

  const { data: saved, error } = await supabase
    .from('notificacoes')
    .insert(rows)
    .select();

  if (error) {
    console.error('Erro ao criar notificacoes:', error);
    throw error;
  }

  const notificacoes = (saved || []).map(toCamel);

  // Emit via socket to each target user
  const io = getIO();
  if (io) {
    notificacoes.forEach((notificacao: any) => {
      io.to(`user:${notificacao.usuarioId}`).emit('notificacao:new', notificacao);
    });
  }

  return notificacoes;
}
