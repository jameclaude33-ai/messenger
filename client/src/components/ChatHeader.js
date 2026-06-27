import { useState, useEffect } from 'react';

export default function ChatHeader({ username, connected, e2eReady, onDisconnect, onToggleSidebar }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        {isMobile && (
          <button onClick={onToggleSidebar} style={styles.menuButton}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <h2 style={styles.title}>Messenger</h2>
        {!isMobile && (
          <div style={styles.status}>
            <div style={{
              ...styles.dot,
              background: connected ? '#22c55e' : '#ef4444',
            }} />
            <span style={styles.statusText}>
              {connected ? 'Подключено' : 'Отключено'}
            </span>
          </div>
        )}
        {e2eReady && (
          <div style={styles.e2eBadge} title="End-to-End шифрование активно">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={styles.e2eText}>E2E</span>
          </div>
        )}
      </div>
      <div style={styles.right}>
        <span style={styles.username}>{username}</span>
        <button onClick={onDisconnect} style={styles.button}>Выйти</button>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '13px',
    color: '#888',
  },
  e2eBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    borderRadius: '5px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  e2eText: {
    fontSize: '10px',
    color: '#22c55e',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  username: {
    fontSize: '13px',
    color: '#888',
  },
  button: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
  },
  menuButton: {
    padding: '6px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
