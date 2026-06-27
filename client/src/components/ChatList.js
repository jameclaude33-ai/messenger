export default function ChatList({ chats, activeChat, onSelect, username }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Чаты</h3>
      </div>
      <div style={styles.list}>
        {chats.length === 0 && (
          <p style={styles.empty}>Нет чатов. Нажмите на пользователя чтобы начать.</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.chatId}
            style={{
              ...styles.item,
              background: activeChat === chat.otherUser ? '#2a2a2a' : 'transparent',
            }}
            onClick={() => onSelect(chat.otherUser)}
          >
            <div style={styles.avatar}>
              {chat.otherUser[0].toUpperCase()}
            </div>
            <div style={styles.info}>
              <div style={styles.nameRow}>
                <span style={styles.name}>{chat.otherUser}</span>
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
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a2a',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    margin: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    color: '#666',
    fontSize: '13px',
    padding: '20px',
    textAlign: 'center',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #1a1a1a',
    transition: 'background 0.15s',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    color: '#888',
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
    color: '#e0e0e0',
  },
  time: {
    fontSize: '11px',
    color: '#666',
  },
  preview: {
    fontSize: '12px',
    color: '#888',
    margin: '2px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    background: '#4f46e5',
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
