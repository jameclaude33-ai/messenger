const express = require('express');
const { register, login, findByEmail, getUserByTag, findOrCreateFromSupabase } = require('../models/user');
const { generateToken } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

const router = express.Router();

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Введите корректный email' });
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ ok: true, message: 'Код отправлен на email' });
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
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (error) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }
    res.json({ ok: true, session: data.session });
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

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (verifyError) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }

    const accessToken = verifyData.session?.access_token;

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { tag: userTag, displayName: displayName || userTag },
    }, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (updateError) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { tag: userTag, displayName: displayName || userTag } },
      });
      if (signUpError) {
        return res.status(400).json({ error: signUpError.message });
      }
    }

    const user = await findOrCreateFromSupabase(email, userTag, displayName || userTag);
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
