import { useState } from 'react';

export default function ChatList({ chats, activeChat, onSelect, username }) {
  const [newChat, setNewChat] = useState('');

  const handleStartChat = (e) => {
    e.preventDefault();
    const target = newChat.trim();
    if (target && target !== username) {
      onSelect(target);
      setNewChat('');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleStartChat} style={styles.searchForm}>
        <input
          style={styles.searchInput}
          placeholder="Новый чат — никнейм..."
          value={newChat}
          onChange={(e) => setNewChat(e.target.value)}
        />
        {newChat.trim() && newChat.trim() !== username && (
          <button type="submit" style={styles.searchBtn}>→</button>
        )}
      </form>
      <div style={styles.list}>
        {chats.length === 0 && !newChat.trim() && (
          <p style={styles.empty}>Нет чатов. Введите никнейм выше, чтобы начать.</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.chatId}
            style={{
              ...styles.item,
              background: activeChat === chat.otherUser ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            }}
            onClick={() => onSelect(chat.otherUser)}
          >
            <div style={styles.avatar}>
              {chat.otherUser[0].toUpperCase()}
            </div>
              <div style={styles.info}>
              <div style={styles.nameRow}>
                <span style={styles.name}>@{chat.otherUser}</span>
                {chat.lastMessage && (
                  <span style={styles.time}>
                    {new Date(chat.lastMessage.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              {chat.lastMessage && (
                <p style={styles.preview}>
                  {chat.lastMessage.from === username && 'Вы: '}
                  {chat.lastMessage.encrypted ? '🔒 Сообщение' : (chat.lastMessage.text || '').substring(0, 40)}
                </p>
              )}
            </div>
            {chat.unread > 0 && (
              <span style={styles.badge}>{chat.unread}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    padding: '12px 12px 4px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#0f131c',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  searchBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    border: 'none',
    background: '#3390ec',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
  },
  empty: {
    color: '#70798a',
    fontSize: '13px',
    padding: '20px',
    textAlign: 'center',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    cursor: 'pointer',
    borderRadius: '12px',
    transition: 'background 0.15s',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#3390ec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  time: {
    fontSize: '11px',
    color: '#70798a',
  },
  preview: {
    fontSize: '13px',
    color: '#70798a',
    margin: '2px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    background: '#3390ec',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    flexShrink: 0,
  },
};
