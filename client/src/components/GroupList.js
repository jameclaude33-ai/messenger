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
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Группы</span>
          <button onClick={() => setCreating(!creating)} style={styles.addBtn}>
            {creating ? '✕' : '+'}
          </button>
        </div>
        {groups.map((group) => (
          <div
            key={group.id}
            onClick={() => onSelect(group.id)}
            style={{
              ...styles.group,
              background: activeGroupId === group.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
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
    flex: 1,
    overflow: 'hidden',
  },
  form: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(11, 14, 22, 0.8)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  createBtn: {
    padding: '10px',
    borderRadius: '12px',
    border: 'none',
    background: '#3390ec',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 10px',
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#70798a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'transparent',
    color: '#70798a',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  groupAvatar: {
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
  groupInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  groupName: {
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: '500',
  },
  groupCount: {
    fontSize: '12px',
    color: '#70798a',
  },
  joinBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #3390ec',
    background: 'transparent',
    color: '#3390ec',
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  empty: {
    textAlign: 'center',
    color: '#70798a',
    fontSize: '13px',
    padding: '20px',
  },
};
