import { useState } from 'react';

const API_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

export default function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Введите корректный email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodeSent(true);
      setStep(2);
      if (data.devCode) setDevCode(data.devCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !code) {
      setError('Заполните все поля');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRegister(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Заполните все поля');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Messenger</h1>
          <p style={styles.subtitle}>Войдите в аккаунт</p>
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={styles.form}>
            <input
              type="text"
              placeholder="Email или имя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
          <p style={styles.switch}>
            Нет аккаунта?{' '}
            <button onClick={() => { setMode('register'); setStep(1); setError(''); }} style={styles.link}>
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Регистрация</h1>
        <p style={styles.subtitle}>
          {step === 1 ? 'Введите email для получения кода' : 'Введите код из письма'}
        </p>

        {step === 1 && (
          <div style={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            <button onClick={handleSendCode} style={styles.button} disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={styles.form}>
            <div style={styles.codeInfo}>
              Код отправлен на <strong>{email}</strong>
            </div>
            {devCode && (
              <div style={styles.devCode}>
                Код: <strong>{devCode}</strong>
              </div>
            )}
            <input
              type="text"
              placeholder="Код из письма"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...styles.input, ...styles.codeInput }}
              maxLength={6}
              required
            />
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              minLength={2}
              maxLength={20}
              required
            />
            <input
              type="password"
              placeholder="Пароль (минимум 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              minLength={6}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            <button onClick={handleRegister} style={styles.button} disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
            <button onClick={() => { setStep(1); setError(''); }} style={styles.backLink}>
              ← Изменить email
            </button>
          </div>
        )}

        <p style={styles.switch}>
          Уже есть аккаунт?{' '}
          <button onClick={() => { setMode('login'); setStep(1); setError(''); }} style={styles.link}>
            Войти
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    height: '100dvh',
    background: '#0f0f0f',
    padding: '16px',
  },
  card: {
    background: '#1a1a1a',
    borderRadius: '12px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: '700',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
    textAlign: 'center',
    margin: '0 0 24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#0f0f0f',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  codeInput: {
    fontSize: '24px',
    textAlign: 'center',
    letterSpacing: '8px',
    fontWeight: '700',
  },
  codeInfo: {
    color: '#888',
    fontSize: '13px',
    textAlign: 'center',
  },
  devCode: {
    color: '#f59e0b',
    fontSize: '13px',
    textAlign: 'center',
    background: 'rgba(245,158,11,0.1)',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    margin: '0',
    textAlign: 'center',
  },
  switch: {
    color: '#888',
    fontSize: '13px',
    textAlign: 'center',
    margin: '16px 0 0 0',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '13px',
    textDecoration: 'underline',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    textAlign: 'center',
    padding: '4px',
  },
};
