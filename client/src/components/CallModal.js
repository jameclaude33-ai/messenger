import { useEffect, useRef } from 'react';

export default function CallModal({
  callState,
  remoteUsername,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  callerSocketId,
  incomingData,
}) {
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.avatar}>
          {remoteUsername?.charAt(0).toUpperCase()}
        </div>
        <h2 style={styles.username}>{remoteUsername}</h2>
        <p style={styles.status}>
          {callState === 'calling' && 'Вызов...'}
          {callState === 'ringing' && 'Входящий звонок'}
          {callState === 'connected' && 'Разговор'}
        </p>

        <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

        <div style={styles.actions}>
          {callState === 'ringing' && (
            <>
              <button onClick={onAccept} style={{ ...styles.button, ...styles.accept }}>
                Принять
              </button>
              <button onClick={onReject} style={{ ...styles.button, ...styles.reject }}>
                Отклонить
              </button>
            </>
          )}
          {(callState === 'calling' || callState === 'connected') && (
            <button onClick={onEnd} style={{ ...styles.button, ...styles.end }}>
              Завершить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    minWidth: '300px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '32px',
    color: '#fff',
    fontWeight: '700',
  },
  username: {
    color: '#fff',
    fontSize: '20px',
    margin: '0 0 8px 0',
  },
  status: {
    color: '#888',
    fontSize: '14px',
    margin: '0 0 24px 0',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 32px',
    borderRadius: '50px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#fff',
  },
  accept: {
    background: '#22c55e',
  },
  reject: {
    background: '#ef4444',
  },
  end: {
    background: '#ef4444',
  },
};
