const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const codes = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  codes.set(email.toLowerCase(), { code, expiresAt, attempts: 0 });

  if (!RESEND_API_KEY) {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return { ok: true, devCode: code };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'Messenger <onboarding@resend.dev>',
      to: email,
      subject: 'Код подтверждения — Messenger',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
          <h2 style="color:#4f46e5;">Messenger</h2>
          <p>Ваш код подтверждения:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;background:#f0f0f0;padding:16px;border-radius:8px;text-align:center;">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;">Код действителен 10 минут.</p>
        </div>
      `,
    });
    return { ok: true };
  } catch (err) {
    console.error('Failed to send email:', err.message);
    return { ok: false, error: 'Не удалось отправить email' };
  }
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
