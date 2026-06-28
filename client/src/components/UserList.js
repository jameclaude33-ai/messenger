export default function UserList({ users, username, onCall, onVideoCall, onChat }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Онлайн</h3>
        <span style={styles.count}>{users.length}</span>
      </div>
      <div style={styles.list}>
        {users.map((user) => (
          <div key={user.id} style={styles.user}>
            <div style={styles.avatar}>
              {user.username[0].toUpperCase()}
            </div>
            <span style={{
              ...styles.name,
              fontWeight: user.username === username ? '700' : '400',
              color: user.username === username ? '#4f46e5' : '#e0e0e0',
            }}>
              {user.username}
              {user.username === username && ' (вы)'}
            </span>
            {user.username !== username && (
              <div style={styles.actions}>
                {onChat && (
                  <button onClick={() => onChat(user.username)} style={styles.callBtn} title="Написать">
                    💬
                  </button>
                )}
                {onVideoCall && (
                  <button onClick={() => onVideoCall(user.username)} style={styles.callBtn} title="Позвонить">
                    📹
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
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
  },
  count: {
    background: '#4f46e5',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
  },
  user: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '8px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
  },
  name: {
    fontSize: '14px',
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  callBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
  },
};
