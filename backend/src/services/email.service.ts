import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'CRM Pos-Obra <noreply@crm-posobra.com>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a2332 0%,#0f1419 100%);padding:30px 40px;text-align:center;">
              <h1 style="margin:0;color:#12b0a0;font-size:24px;letter-spacing:2px;">CRM POS-OBRA</h1>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">Sistema de Gestao Integrada</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px;">
              <h2 style="margin:0 0 20px;color:#1a2332;font-size:18px;">${title}</h2>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Este email foi enviado automaticamente pelo CRM Pos-Obra.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log('[Email] SMTP not configured, skipping email to:', to);
    return;
  }

  try {
    await t.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log('[Email] Sent to:', to);
  } catch (error) {
    console.error('[Email] Failed to send to:', to, error);
  }
}

export async function sendNewChamadoEmail(
  to: string,
  chamadoNumero: number,
  descricao: string,
): Promise<void> {
  const subject = `Novo chamado atribuido - #${chamadoNumero}`;
  const html = baseTemplate('Novo Chamado Atribuido', `
    <p style="color:#374151;line-height:1.6;">
      Voce foi designado como responsavel por um novo chamado.
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f0fdfa;border-radius:8px;border-left:4px solid #12b0a0;margin:16px 0;">
      <tr>
        <td>
          <p style="margin:0 0 8px;color:#0d8a7c;font-weight:bold;">Chamado #${chamadoNumero}</p>
          <p style="margin:0;color:#374151;font-size:14px;">${descricao.substring(0, 200)}${descricao.length > 200 ? '...' : ''}</p>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:14px;">
      Acesse o sistema para mais detalhes e iniciar o atendimento.
    </p>
  `);

  await sendMail(to, subject, html);
}

export async function sendStatusChangeEmail(
  to: string,
  chamadoNumero: number,
  statusAnterior: string,
  statusNovo: string,
): Promise<void> {
  const subject = `Status alterado - Chamado #${chamadoNumero}`;
  const html = baseTemplate('Status do Chamado Alterado', `
    <p style="color:#374151;line-height:1.6;">
      O status do chamado <strong>#${chamadoNumero}</strong> foi alterado.
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin:16px 0;">
      <tr>
        <td>
          <p style="margin:0;color:#92400e;font-size:14px;">
            <strong>${statusAnterior}</strong> &rarr; <strong>${statusNovo}</strong>
          </p>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:14px;">
      Acesse o sistema para mais detalhes.
    </p>
  `);

  await sendMail(to, subject, html);
}

export async function sendSlaAlertEmail(
  to: string,
  chamadoNumero: number,
  horasRestantes: number,
): Promise<void> {
  const subject = `Alerta SLA - Chamado #${chamadoNumero}`;
  const html = baseTemplate('Alerta de SLA', `
    <p style="color:#374151;line-height:1.6;">
      O chamado <strong>#${chamadoNumero}</strong> esta proximo do vencimento do SLA.
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#fee2e2;border-radius:8px;border-left:4px solid #ef4444;margin:16px 0;">
      <tr>
        <td>
          <p style="margin:0;color:#991b1b;font-size:14px;">
            <strong>Tempo restante:</strong> ${horasRestantes > 0 ? `${horasRestantes.toFixed(1)} horas` : 'VENCIDO'}
          </p>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:14px;">
      Acesse o sistema e priorize o atendimento deste chamado.
    </p>
  `);

  await sendMail(to, subject, html);
}
