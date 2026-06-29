import { useState, useRef, useEffect, useCallback } from 'react';
import TypingIndicator from './TypingIndicator';

export default function PrivateChat({ messages, username, onSend, onBack, otherUser, otherUserDisplayName, decryptMessage, isTyping, onTyping, onStopTyping, userStatus }) {
  const [text, setText] = useState('');
  const [decryptedMessages, setDecryptedMessages] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!decryptMessage || !messages.length) {
      setDecryptedMessages(messages);
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(messages.map(decryptMessage));
      if (!cancelled) setDecryptedMessages(results);
    })();
    return () => { cancelled = true; };
  }, [messages, decryptMessage]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [decryptedMessages, isTyping]);

  const handleTyping = useCallback(() => {
    if (onTyping) onTyping();
  }, [onTyping]);

  const handleSend = () => {
    if (!text.trim()) return;
    if (onStopTyping) onStopTyping();
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return '';
    const now = new Date();
    const date = new Date(lastSeen);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return 'вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const statusText = userStatus?.online
    ? 'в сети'
    : userStatus?.lastSeen
      ? `был(а) ${formatLastSeen(userStatus.lastSeen)}`
      : 'не в сети';

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) {
      handleTyping();
    } else if (onStopTyping) {
      onStopTyping();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>←</button>
        <div style={styles.avatar}>{otherUser[0].toUpperCase()}</div>
        <div>
          <div style={styles.name}>{otherUserDisplayName || otherUser}</div>
          <div style={{ ...styles.status, color: userStatus?.online ? '#22c55e' : '#70798a' }}>
            {statusText}
          </div>
          <div style={styles.e2e}>🔒 E2E</div>
        </div>
      </div>

      <div style={styles.messages} ref={listRef}>
        {decryptedMessages.length === 0 && (
          <p style={styles.empty}>Начните диалог с {otherUser}</p>
        )}
        {decryptedMessages.map((msg) => {
          const isOwn = msg.from === username;
          return (
            <div key={msg.id} style={{ ...styles.bubble, alignSelf: isOwn ? 'flex-end' : 'flex-start', background: isOwn ? '#4f46e5' : '#1a1a1a' }}>
              <p style={styles.text}>{msg.text}</p>
              <div style={styles.msgInfo}>
                <span style={styles.time}>
                  {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isOwn && (
                  <span style={{ ...styles.ticks, color: msg.read ? '#53a6f3' : 'rgba(255,255,255,0.4)' }}>
                    {msg.read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && <TypingIndicator typingUsers={[otherUser]} currentUsername={username} />}
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение..."
        />
        <button onClick={handleSend} style={styles.sendBtn}>↑</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f0f0f',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    color: '#888',
  },
  name: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
  },
  tag: {
    color: '#70798a',
    fontSize: '11px',
  },
  status: {
    fontSize: '12px',
  },
  e2e: {
    color: '#22c55e',
    fontSize: '11px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  empty: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    margin: 'auto',
  },
  bubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '16px',
    borderBottomRightRadius: '4px',
  },
  text: {
    color: '#fff',
    fontSize: '14px',
    margin: 0,
    lineHeight: '20px',
    wordBreak: 'break-word',
  },
  msgInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
    marginTop: '4px',
  },
  time: {
    color: '#888',
    fontSize: '10px',
  },
  ticks: {
    fontSize: '12px',
    letterSpacing: '-2px',
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    background: '#1a1a1a',
    borderTop: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: '#0f0f0f',
    border: '1px solid #333',
    borderRadius: '20px',
    padding: '10px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#4f46e5',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
