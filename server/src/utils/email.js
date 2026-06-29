const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'noreply@messenger.app';

const codes = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildHtml(code) {
  return `
    <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
      <h2 style="color:#4f46e5;">Messenger</h2>
      <p>Ваш код подтверждения:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;background:#f0f0f0;padding:16px;border-radius:8px;text-align:center;">
        ${code}
      </div>
      <p style="color:#888;font-size:13px;">Код действителен 10 минут.</p>
    </div>
  `;
}

async function sendViaResend(email, code) {
  if (!RESEND_API_KEY) return null;
  try {
    const resend = new Resend(RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'Messenger <onboarding@resend.dev>',
      to: email,
      subject: 'Код подтверждения — Messenger',
      html: buildHtml(code),
    });
    if (result.error) {
      console.error('[Resend] Error:', JSON.stringify(result.error));
      return null;
    }
    return { ok: true };
  } catch (err) {
    console.error('[Resend] Exception:', err.message);
    return null;
  }
}

async function sendViaSmtp(email, code) {
  if (!SMTP_HOST || !SMTP_USER) return null;
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: parseInt(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Код подтверждения — Messenger',
      html: buildHtml(code),
    });
    return { ok: true };
  } catch (err) {
    console.error('[SMTP] Failed:', err.message);
    return null;
  }
}

async function sendVerificationCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  codes.set(email.toLowerCase(), { code, expiresAt, attempts: 0 });

  let sent = false;
  try {
    const result = await sendViaResend(email, code);
    if (result) sent = true;
  } catch (e) {
    console.error('[Resend] Exception in sendVerificationCode:', e.message);
  }

  if (!sent) {
    try {
      const result = await sendViaSmtp(email, code);
      if (result) sent = true;
    } catch (e) {
      console.error('[SMTP] Exception in sendVerificationCode:', e.message);
    }
  }

  if (sent) {
    console.log(`[Email] Code sent to ${email}`);
    return { ok: true };
  }

  // Dev fallback — log code to console and return to client
  console.log(`[DEV] Verification code for ${email}: ${code}`);
  return { ok: true, devCode: code };
}

function verifyCode(email, inputCode) {
  const entry = codes.get(email.toLowerCase());
  if (!entry) return { valid: false, error: 'Код не запрашивался' };
  if (Date.now() > entry.expiresAt) {
    codes.delete(email.toLowerCase());
    return { valid: false, error: 'Код истёк' };
  }
  if (entry.attempts >= 5) {
    codes.delete(email.toLowerCase());
    return { valid: false, error: 'Слишком много попыток' };
  }
  entry.attempts++;
  if (entry.code !== inputCode) {
    return { valid: false, error: 'Неверный код' };
  }
  codes.delete(email.toLowerCase());
  return { valid: true };
}

function cleanupExpired() {
  const now = Date.now();
  for (const [email, entry] of codes) {
    if (now > entry.expiresAt) codes.delete(email);
  }
}

setInterval(cleanupExpired, 5 * 60 * 1000);

module.exports = { sendVerificationCode, verifyCode };
