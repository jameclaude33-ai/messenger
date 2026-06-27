import { useEffect, useRef, useState } from 'react';

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
  onToggleVideo,
  onToggleAudio,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      setVideoEnabled(!!videoTrack && videoTrack.enabled);
    }
  }, [localStream]);

  const hasVideo = localStream && localStream.getVideoTracks().length > 0;
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
    if (onToggleVideo) onToggleVideo();
  };

  const handleToggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
    if (onToggleAudio) onToggleAudio();
  };

  if (callState === 'idle') return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {(hasVideo || hasRemoteVideo) && (
          <div style={styles.videoContainer}>
            {hasRemoteVideo && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={styles.remoteVideo}
              />
            )}
            {hasVideo && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={styles.localVideo}
              />
            )}
          </div>
        )}

        {!hasVideo && (
          <>
            <div style={styles.avatar}>
              {remoteUsername?.charAt(0).toUpperCase()}
            </div>
            <h2 style={styles.username}>{remoteUsername}</h2>
          </>
        )}

        <p style={styles.status}>
          {callState === 'calling' && 'Вызов...'}
          {callState === 'ringing' && 'Входящий звонок'}
          {callState === 'connected' && 'Разговор'}
        </p>

        <div style={styles.actions}>
          {callState === 'ringing' && (
            <>
              <button onClick={() => onAccept(incomingData, true)} style={{ ...styles.button, ...styles.accept }} title="С видео">
                Видео
              </button>
              <button onClick={() => onAccept(incomingData, false)} style={{ ...styles.button, ...styles.accept }} title="Только аудио">
                Аудио
              </button>
              <button onClick={onReject} style={{ ...styles.button, ...styles.reject }}>
                Отклонить
              </button>
            </>
          )}
          {callState === 'calling' && (
            <button onClick={onEnd} style={{ ...styles.button, ...styles.end }}>
              Завершить
            </button>
          )}
          {callState === 'connected' && (
            <>
              <button onClick={handleToggleAudio} style={{ ...styles.button, background: audioEnabled ? '#333' : '#ef4444' }}>
                {audioEnabled ? '🎤' : '🔇'}
              </button>
              <button onClick={handleToggleVideo} style={{ ...styles.button, background: videoEnabled ? '#333' : '#ef4444' }}>
                {videoEnabled ? '📹' : '📷'}
              </button>
              <button onClick={onEnd} style={{ ...styles.button, ...styles.end }}>
                Завершить
              </button>
            </>
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
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    minWidth: '300px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '640px',
    aspectRatio: '16/9',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#000',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  localVideo: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    width: '120px',
    height: '90px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '2px solid #4f46e5',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#fff',
    fontWeight: '700',
  },
  username: {
    color: '#fff',
    fontSize: '20px',
    margin: 0,
  },
  status: {
    color: '#888',
    fontSize: '14px',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 24px',
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
