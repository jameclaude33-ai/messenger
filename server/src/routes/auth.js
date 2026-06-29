const express = require('express');
const { register, login, findByEmail, getUserByTag } = require('../models/user');
const { generateToken } = require('../middleware/auth');
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
      return res.status(500).json({ error: result.error });
    }
    const response = { ok: true, message: 'Код отправлен на email' };
    if (result.devCode) response.devCode = result.devCode;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, tag, password, email, code, displayName } = req.body;
    const userTag = tag || username;
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
    const verification = verifyCode(email, code);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }
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
    username = username.replace('@', '');
    const user = await login(username, password);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});

router.get('/user/:tag', (req, res) => {
  const user = getUserByTag(req.params.tag);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  res.json(user);
});

module.exports = router;
