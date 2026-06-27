import { useRef, useEffect, useState } from 'react';
import { formatTime } from '../utils/helpers';

export default function GroupChat({ group, messages, username, onSendMessage, onLeave, onBack }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div style={styles.headerInfo}>
          <h3 style={styles.title}>{group.name}</h3>
          <span style={styles.subtitle}>{group.memberCount} участников</span>
        </div>
        <button onClick={onLeave} style={styles.leaveBtn}>Покинуть</button>
      </div>
      <div style={styles.messages}>
        {messages.map((msg) => {
          if (msg.system) {
            return (
              <div key={msg.id} style={styles.systemMessage}>
                {msg.text}
              </div>
            );
          }
          const isOwn = msg.username === username;
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageWrapper,
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.message,
                  background: isOwn ? '#4f46e5' : '#2a2a2a',
                  borderBottomRightRadius: isOwn ? '4px' : '16px',
                  borderBottomLeftRadius: isOwn ? '16px' : '4px',
                }}
              >
                {!isOwn && <div style={styles.username}>{msg.username}</div>}
                <div style={styles.text}>{msg.text}</div>
                <div style={styles.time}>{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение в группу..."
          style={styles.input}
          maxLength={1000}
        />
        <button type="submit" disabled={!text.trim()} style={styles.sendBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
  },
  backBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#888',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: '12px',
    color: '#666',
  },
  leaveBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #ef4444',
    background: 'transparent',
    color: '#ef4444',
    fontSize: '13px',
    cursor: 'pointer',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  systemMessage: {
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
    padding: '8px 0',
  },
  messageWrapper: {
    display: 'flex',
  },
  message: {
    maxWidth: '70%',
    padding: '10px 14px',
    borderRadius: '16px',
  },
  username: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
    fontWeight: '600',
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  },
  time: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px',
    textAlign: 'right',
  },
  form: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #2a2a2a',
    background: '#1a1a1a',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #333',
    background: '#2a2a2a',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
  },
  sendBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
