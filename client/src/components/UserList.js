export default function UserList({ users, username, onCall, onVideoCall, onChat }) {
  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Онлайн</div>
      <div style={styles.list}>
        {users.map((user) => (
          <div key={user.id} style={styles.user}>
            <div style={styles.avatar}>
              {user.username[0].toUpperCase()}
            </div>
            <div style={styles.info}>
              <div style={{
                ...styles.name,
                fontWeight: user.username === username ? '700' : '400',
                color: user.username === username ? '#3390ec' : '#ffffff',
              }}>
                {user.username}
                {user.username === username && ' (вы)'}
              </div>
              <div style={styles.status}>Онлайн</div>
            </div>
            {user.username !== username && (
              <div style={styles.actions}>
                {onChat && (
                  <button onClick={() => onChat(user.username)} style={styles.actionBtn} title="Написать">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                )}
                {onVideoCall && (
                  <button onClick={() => onVideoCall(user.username)} style={styles.actionBtn} title="Видеозвонок">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  </button>
                )}
              </div>
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
    flex: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#70798a',
    padding: '10px 20px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 10px 10px',
  },
  user: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
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
  name: {
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  status: {
    fontSize: '12px',
    color: '#70798a',
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    color: '#70798a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s, background 0.2s',
  },
};
