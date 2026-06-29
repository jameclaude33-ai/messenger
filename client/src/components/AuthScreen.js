import { useState, useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export default function AuthScreen({ onLogin, onRegister }) {
  useEffect(() => {
    return () => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    };
  }, []);

  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [devCode, setDevCode] = useState('');
  const codeRefs = useRef([]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Введите корректный email');
      triggerShake();
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
      if (data.devCode) setDevCode(data.devCode);
      setStep(2);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = async (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    if (newCode.every(c => c) && index === 5) {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/api/auth/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: newCode.join('') }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTimeout(() => setStep(3), 200);
      } catch (err) {
        setError(err.message || 'Неверный код');
        triggerShake();
        setCode(['', '', '', '', '', '']);
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = async (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/api/auth/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: pasted }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTimeout(() => setStep(3), 200);
      } catch (err) {
        setError(err.message || 'Неверный код');
        triggerShake();
        setCode(['', '', '', '', '', '']);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      setError('Заполните все поля');
      triggerShake();
      return;
    }
    if (username.length < 3) {
      setError('Тег минимум 3 символа');
      triggerShake();
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Тег: только латиница, цифры и _');
      triggerShake();
      return;
    }
    if (password.length < 6) {
      setError('Пароль минимум 6 символов');
      triggerShake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: username, displayName: displayName || username, password, email, code: code.join('') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      document.activeElement?.blur();
      onRegister(data);
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Заполните все поля');
      triggerShake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      document.activeElement?.blur();
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'login') return 'Вход в аккаунт';
    if (step === 1) return 'Регистрация';
    if (step === 2) return 'Проверка кода';
    return 'О себе';
  };

  const getSubtitle = () => {
    if (mode === 'login') return 'Введите ваши данные для входа';
    if (step === 1) return 'Введите email для получения кода';
    if (step === 2) return `Код отправлен на ${email}`;
    return 'Укажите имя пользователя и пароль';
  };

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.card,
        animation: shake ? 'shake 0.3s ease-in-out' : 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
            </svg>
          </div>
          <h1 style={styles.title}>{getTitle()}</h1>
          <p style={styles.subtitle}>{getSubtitle()}</p>
        </div>

        {mode === 'login' && (
          <div style={styles.step}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Имя пользователя или Email</label>
              <input
                type="text"
                placeholder="username или email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Пароль</label>
              <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button onClick={handleLogin} style={styles.button} disabled={loading}>
              {loading ? 'Загрузка...' : 'Войти'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <div style={styles.centerLink}>
              <button onClick={() => { setMode('register'); setStep(1); setError(''); }} style={styles.link}>
                Нет аккаунта? Зарегистрироваться
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && step === 1 && (
          <div style={styles.step}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              />
              <p style={styles.hint}>Мы отправим код подтверждения на эту почту</p>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button onClick={handleSendCode} style={styles.button} disabled={loading}>
              {loading ? 'Отправка...' : 'Получить код'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <div style={styles.centerLink}>
              <button onClick={() => { setMode('login'); setError(''); }} style={styles.link}>
                Уже есть аккаунт? Войти
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && step === 2 && (
          <div style={styles.step}>
            <div style={styles.codeContainer}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => codeRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onPaste={handleCodePaste}
                  style={styles.codeInput}
                />
              ))}
            </div>
            {devCode && (
              <div style={styles.devCode}>
                DEV: код <strong>{devCode}</strong>
              </div>
            )}
            {error && <p style={styles.error}>{error}</p>}
            <p style={styles.hint}>Введите 6-значный код из письма</p>
            <div style={styles.centerLink}>
              <button onClick={() => { setStep(1); setError(''); }} style={styles.link}>
                Изменить email
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && step === 3 && (
          <div style={styles.step}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Имя (отображается)</label>
              <input
                type="text"
                placeholder="Как вас зовут?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={styles.input}
                maxLength={30}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Тег (уникальный)</label>
              <input
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                style={styles.input}
                minLength={3}
                maxLength={20}
              />
              <span style={styles.hintSmall}>Латиница, цифры и _ — для поиска и добавления в чат</span>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Пароль</label>
              <input
                type="password"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                minLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button onClick={handleRegister} style={styles.button} disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <div style={styles.centerLink}>
              <button onClick={() => { setStep(2); setError(''); }} style={styles.link}>
                Назад
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'radial-gradient(circle at 50% 0%, #1a233a 0%, #0f131c 100%)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(23, 28, 41, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '40px 36px',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, #3390ec, #1a6cb3)',
    borderRadius: '18px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    boxShadow: '0 8px 16px rgba(51, 144, 236, 0.25)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#70798a',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  step: {
    animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    color: '#70798a',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(11, 14, 22, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  codeContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    margin: '28px 0',
  },
  codeInput: {
    width: '52px',
    height: '56px',
    background: 'rgba(11, 14, 22, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#3390ec',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.1s ease',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  error: {
    color: '#ff595a',
    fontSize: '13px',
    margin: '0 0 12px 0',
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
    marginBottom: '12px',
  },
  hint: {
    fontSize: '13px',
    color: '#70798a',
    marginTop: '8px',
    lineHeight: '1.4',
  },
  hintSmall: {
    fontSize: '11px',
    color: '#70798a',
    marginTop: '4px',
    display: 'block',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#3390ec',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
    marginTop: '16px',
    display: 'inline-block',
  },
  centerLink: {
    textAlign: 'center',
  },
};
