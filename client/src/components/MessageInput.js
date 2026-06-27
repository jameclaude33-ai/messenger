import { useState, useRef, useEffect } from 'react';
import FileUpload from './FileUpload';

export default function MessageInput({ onSend, onFileUpload, userId }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
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
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Сообщение..."
        style={styles.input}
        maxLength={1000}
      />
      <button type="submit" disabled={!text.trim()} style={styles.button}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
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
  button: {
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
