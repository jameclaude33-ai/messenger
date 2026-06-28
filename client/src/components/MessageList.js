import { useRef, useEffect } from 'react';
import { formatTime } from '../utils/helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function isImage(mimetype) {
  return mimetype && mimetype.startsWith('image/');
}

function FilePreview({ file }) {
  if (isImage(file.mimetype)) {
    return (
      <a href={`${API_URL}${file.url}`} target="_blank" rel="noopener noreferrer">
        <img
          src={`${API_URL}${file.url}`}
          alt={file.originalName}
          style={styles.fileImage}
        />
      </a>
    );
  }

  return (
    <a
      href={`${API_URL}${file.url}`}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.fileLink}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
      <span>{file.originalName}</span>
    </a>
  );
}

export default function MessageList({ messages, username }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={styles.container}>
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
                  background: isOwn ? 'var(--my-message-bg, #2b5278)' : 'var(--message-bg, #1e2838)',
                  borderBottomRightRadius: isOwn ? '4px' : '14px',
                  borderBottomLeftRadius: isOwn ? '14px' : '4px',
                }}
              >
                {!isOwn && <div style={styles.username}>{msg.username}</div>}
                {msg.file ? (
                  <FilePreview file={msg.file} />
                ) : (
                  <div style={styles.text}>{msg.text}</div>
                )}
                <div style={styles.msgInfo}>
                  <span>{formatTime(msg.timestamp)}</span>
                  {isOwn && <span style={styles.ticks}>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#0e1621',
    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(43, 56, 78, 0.4) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  systemMessage: {
    textAlign: 'center',
    color: 'var(--text-secondary, #70798a)',
    fontSize: '13px',
    padding: '8px 0',
  },
  messageWrapper: {
    display: 'flex',
  },
  message: {
    maxWidth: '60%',
    padding: '10px 14px',
    borderRadius: '14px',
    fontSize: '15px',
    lineHeight: '1.4',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
  },
  username: {
    fontSize: '12px',
    color: 'var(--accent-color, #3390ec)',
    marginBottom: '4px',
    fontWeight: '600',
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
    color: '#ffffff',
  },
  msgInfo: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
    marginTop: '6px',
    userSelect: 'none',
  },
  ticks: {
    color: '#53a6f3',
    fontSize: '12px',
    letterSpacing: '-2px',
    marginRight: '2px',
  },
  fileImage: {
    maxWidth: '300px',
    maxHeight: '200px',
    borderRadius: '8px',
    display: 'block',
    marginBottom: '4px',
  },
  fileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#93c5fd',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
};
