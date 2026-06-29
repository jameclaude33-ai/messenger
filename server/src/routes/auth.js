const express = require('express');
const { register, login, findByEmail, getUserByTag, findOrCreateFromSupabase } = require('../models/user');
const { generateToken } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const { sendVerificationCode, verifyCode } = require('../utils/email');

const router = express.Router();

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Введите корректный email' });
    }
    const result = await sendVerificationCode(email);
    if (!result.ok) {
      return res.status(500).json({ error: result.error || 'Не удалось отправить код' });
    }
    const response = { ok: true, message: 'Код отправлен на email' };
    if (result.devCode) response.devCode = result.devCode;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email и код обязательны' });
    }
    const result = verifyCode(email, code);
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Неверный код' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { tag, password, email, code, displayName } = req.body;
    const userTag = tag;
    if (!userTag || !password || !email || !code) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (userTag.length < 3 || userTag.length > 20) {
      return res.status(400).json({ error: 'Тег должен быть 3-20 символов' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(userTag)) {
      return res.status(400).json({ error: 'Тег: только латиница, цифры и _' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    }

    // Verify email code
    const codeResult = verifyCode(email, code);
    if (!codeResult.valid) {
      return res.status(400).json({ error: codeResult.error || 'Неверный или истёкший код' });
    }

    // Try Supabase signUp (optional — for Supabase Auth integration)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { tag: userTag, displayName: displayName || userTag } },
      });
      if (signUpError && !signUpError.message.includes('already registered')) {
        console.log('[Supabase] signUp note:', signUpError.message);
      }
    } catch (e) {
      console.log('[Supabase] signUp skipped:', e.message);
    }

    // Create user locally
    const user = await register(userTag, password, email, displayName || userTag);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    // Try local login first
    try {
      const user = await login(username, password);
      const token = generateToken(user);
      return res.json({ user, token });
    } catch (localErr) {
      // Local login failed, try Supabase
    }

    // Fallback: Supabase login
    let email = username;
    if (!username.includes('@')) {
      const userByTag = getUserByTag(username.replace('@', ''));
      if (userByTag && userByTag.email) {
        email = userByTag.email;
      } else {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = await findOrCreateFromSupabase(email, data.user.user_metadata?.tag, data.user.user_metadata?.displayName);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});

module.exports = router;
