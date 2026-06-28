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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#171c29',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#171c29',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
  },
  button: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: '#3390ec',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
