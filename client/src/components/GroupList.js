import { useState } from 'react';

export default function GroupList({ groups, onJoin, onCreate, activeGroupId, onSelect }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
      setCreating(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Группы</h3>
        <button onClick={() => setCreating(!creating)} style={styles.addBtn}>
          {creating ? '✕' : '+'}
        </button>
      </div>
      {creating && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название группы..."
            style={styles.input}
            autoFocus
          />
          <button type="submit" disabled={!name.trim()} style={styles.createBtn}>
            Создать
          </button>
        </form>
      )}
      <div style={styles.list}>
        {groups.map((group) => (
          <div
            key={group.id}
            onClick={() => onSelect(group.id)}
            style={{
              ...styles.group,
              background: activeGroupId === group.id ? '#4f46e5' : 'transparent',
            }}
          >
            <div style={styles.groupAvatar}>
              {group.name[0].toUpperCase()}
            </div>
            <div style={styles.groupInfo}>
              <span style={styles.groupName}>{group.name}</span>
              <span style={styles.groupCount}>{group.memberCount} уч.</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}
              style={styles.joinBtn}
            >
              Войти
            </button>
          </div>
        ))}
        {groups.length === 0 && (
          <div style={styles.empty}>Нет групп</div>
        )}
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
    padding: '12px 20px',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#888',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderBottom: '1px solid #2a2a2a',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#2a2a2a',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  createBtn: {
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  groupAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
  },
  groupInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  groupName: {
    fontSize: '14px',
    color: '#e0e0e0',
    fontWeight: '500',
  },
  groupCount: {
    fontSize: '12px',
    color: '#666',
  },
  joinBtn: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #4f46e5',
    background: 'transparent',
    color: '#4f46e5',
    fontSize: '12px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
    padding: '20px',
  },
};
