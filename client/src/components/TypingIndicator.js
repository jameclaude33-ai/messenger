export default function TypingIndicator({ typingUsers, currentUsername }) {
  const others = typingUsers.filter((u) => u !== currentUsername);
  if (others.length === 0) return null;

  const text = others.length === 1
    ? `${others[0]} печатает...`
    : `${others.join(', ')} печатают...`;

  return (
    <div style={styles.container}>
      <span style={styles.text}>{text}</span>
    </div>
  );
}

const styles = {
  container: {
    padding: '4px 20px 8px',
  },
  text: {
    fontSize: '13px',
    color: '#888',
    fontStyle: 'italic',
  },
};
