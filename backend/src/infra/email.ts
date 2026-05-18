import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST'],
  port: Number(process.env['SMTP_PORT'] ?? 587),
  auth: {
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
  },
});

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env['FRONTEND_URL']}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env['SMTP_USER'],
    to,
    subject: 'Redefinição de senha — Finanças Familiares',
    html: `
      <p>Você solicitou a redefinição da sua senha.</p>
      <p><a href="${resetUrl}">Clique aqui para redefinir sua senha</a></p>
      <p>Este link é válido por 1 hora. Se não foi você, ignore este e-mail.</p>
    `,
  });
}
