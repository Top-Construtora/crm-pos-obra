import { AppDataSource } from '../database/data-source.js';
import { Notificacao } from '../entities/Notificacao.js';
import { User } from '../entities/User.js';
import { getIO } from '../socket.js';
import { sendNewChamadoEmail, sendStatusChangeEmail, sendSlaAlertEmail } from '../services/email.service.js';

const getRepo = () => AppDataSource.getRepository(Notificacao);
const getUserRepo = () => AppDataSource.getRepository(User);

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
}): Promise<Notificacao> {
  const repo = getRepo();
  const { emailData, ...notifParams } = params;
  const notificacao = repo.create(notifParams);
  const saved = await repo.save(notificacao);

  // Emit via socket to the target user
  const io = getIO();
  if (io) {
    io.to(`user:${params.usuarioId}`).emit('notificacao:new', saved);
  }

  // Send email notification (async, non-blocking)
  sendEmailForNotification(params.usuarioId, params.tipo, emailData).catch(() => {});

  return saved;
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
  if (!emailData) return;

  const user = await getUserRepo().findOne({ where: { id: usuarioId } });
  if (!user?.email) return;

  const { chamadoNumero, descricao, statusAnterior, statusNovo, horasRestantes } = emailData;

  if (tipo === 'ATRIBUICAO' && chamadoNumero && descricao) {
    await sendNewChamadoEmail(user.email, chamadoNumero, descricao);
  } else if (tipo === 'STATUS_ALTERADO' && chamadoNumero && statusAnterior && statusNovo) {
    await sendStatusChangeEmail(user.email, chamadoNumero, statusAnterior, statusNovo);
  } else if (tipo === 'SLA_ALERTA' && chamadoNumero && horasRestantes !== undefined) {
    await sendSlaAlertEmail(user.email, chamadoNumero, horasRestantes);
  }
}

export async function criarNotificacoes(
  usuarioIds: string[],
  params: { tipo: string; titulo: string; mensagem: string; chamadoId?: string }
): Promise<Notificacao[]> {
  const repo = getRepo();
  const uniqueIds = [...new Set(usuarioIds)];
  const notificacoes = uniqueIds.map((usuarioId) => repo.create({ ...params, usuarioId }));
  const saved = await repo.save(notificacoes);

  // Emit via socket to each target user
  const io = getIO();
  if (io) {
    saved.forEach((notificacao) => {
      io.to(`user:${notificacao.usuarioId}`).emit('notificacao:new', notificacao);
    });
  }

  return saved;
}
