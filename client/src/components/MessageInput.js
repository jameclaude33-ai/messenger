import { useState, useRef, useEffect, useCallback } from 'react';
import FileUpload from './FileUpload';

export default function MessageInput({ onSend, onFileUpload, userId, onTyping, onStopTyping }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleTyping = useCallback(() => {
    if (onTyping) onTyping();
  }, [onTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      if (onStopTyping) onStopTyping();
      onSend(text.trim());
      setText('');
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) {
      handleTyping();
    } else if (onStopTyping) {
      onStopTyping();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUploaded = (fileData) => {
    if (onFileUpload) {
      onFileUpload(fileData);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {onFileUpload && (
        <FileUpload userId={userId} onFileUploaded={handleFileUploaded} />
      )}
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Написать сообщение..."
        style={styles.input}
        maxLength={1000}
      />
      <button type="submit" disabled={!text.trim()} style={styles.button}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}>
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    background: 'var(--sidebar-bg, #171c29)',
    borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    borderRadius: '20px',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
    background: 'var(--bg-color, #0f131c)',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  button: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--accent-color, #3390ec)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
};
