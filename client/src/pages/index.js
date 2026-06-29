import GlobalStyles from '../styles/global';
import { useAuth, useSocket, useE2E, useChat, useP2PCall } from '../hooks/useChat';
import { usePrivateChats } from '../hooks/usePrivateChat';
import AuthScreen from '../components/AuthScreen';
import ChatHeader from '../components/ChatHeader';
import ChatList from '../components/ChatList';
import PrivateChat from '../components/PrivateChat';
import CallModal from '../components/CallModal';
import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  const { user, token, loading, register, login, logout } = useAuth();
  const { socket, connected } = useSocket(token);
  const { keyPair: e2eKeyPair, ready: e2eReady } = useE2E(socket, token);
  const { joined, join } = useChat(socket, e2eKeyPair, e2eReady, user);
  const {
    chats,
    activeChat,
    messages: privateMessages,
    openChat,
    closeChat,
    sendPrivateMessage,
    decryptMessage: decryptPrivateMessage,
    typingUsers: privateTypingUsers,
  } = usePrivateChats(socket, e2eKeyPair, e2eReady, token, user);
  const {
    callState,
    remoteUsername: callRemoteUsername,
    localStream,
    remoteStream,
    isScreenSharing,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    startScreenShare,
    stopScreenShare,
    callerSocketId,
  } = useP2PCall(socket, user?.username);
  const [showSidebar, setShowSidebar] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (user) {
      const el = document.documentElement;
      el.style.height = '0px';
      requestAnimationFrame(() => {
        el.style.height = '';
        window.scrollTo(0, 0);
      });
    }
  }, [user]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setShowSidebar(false);
    else setShowSidebar(true);
  }, [isMobile]);

  useEffect(() => {
    if (!socket) return;
    socket.on('call:incoming', (data) => setIncomingCall(data));
    return () => socket.off('call:incoming');
  }, [socket]);

  useEffect(() => {
    if (callState === 'idle') setIncomingCall(null);
  }, [callState]);

  useEffect(() => {
    if (user && token && socket && !joined) join();
  }, [user, token, socket, joined, join]);

  const toggleSidebar = useCallback(() => setShowSidebar(v => !v), []);

  const handleOpenChat = useCallback((username) => {
    openChat(username);
    if (isMobile) setShowSidebar(false);
  }, [openChat, isMobile]);

  if (loading) {
    return (
      <>
        <GlobalStyles />
        <div style={styles.loading}>Загрузка...</div>
      </>
    );
  }

  if (!user || !token) {
    return (
      <>
        <GlobalStyles />
        <AuthScreen onLogin={login} onRegister={register} />
      </>
    );
  }

  const sidebarContent = (
    <div style={styles.sidebarInner}>
      <ChatList chats={chats} activeChat={activeChat} onSelect={handleOpenChat} username={user.username} />
    </div>
  );

  const renderMain = () => {
    if (activeChat) {
      return (
        <PrivateChat
          messages={privateMessages}
          username={user.username}
          otherUser={activeChat}
          onSend={sendPrivateMessage}
          onBack={closeChat}
          decryptMessage={decryptPrivateMessage}
          isTyping={Object.keys(privateTypingUsers).length > 0}
          onTyping={() => socket?.emit('private:typing', { to: activeChat })}
          onStopTyping={() => socket?.emit('private:stopTyping', { to: activeChat })}
        />
      );
    }
    return (
      <div style={styles.welcome}>
        <div style={styles.welcomeIcon}>💬</div>
        <h2 style={styles.welcomeTitle}>Messenger</h2>
        <p style={styles.welcomeText}>Выберите чат или начните новый</p>
      </div>
    );
  };

  return (
    <>
      <GlobalStyles />
      <div style={styles.chat}>
        <ChatHeader
          username={user.username}
          connected={connected}
          e2eReady={e2eReady}
          onDisconnect={logout}
          onToggleSidebar={toggleSidebar}
        />
        <div style={styles.body}>
          {isMobile ? (
            <>
              {showSidebar && (
                <div style={styles.overlay} onClick={() => setShowSidebar(false)} />
              )}
              <div style={{
                ...styles.sidebarMobile,
                transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
              }}>
                {sidebarContent}
              </div>
            </>
          ) : (
            showSidebar && <div style={styles.sidebar}>{sidebarContent}</div>
          )}
          <div style={styles.main}>
            {renderMain()}
          </div>
        </div>
      </div>

      {callState !== 'idle' && (
        <CallModal
          callState={callState}
          remoteUsername={callRemoteUsername}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={(data, withVideo) => acceptCall(data, withVideo)}
          onReject={() => rejectCall(incomingCall)}
          onEnd={() => {
            socket.emit('call:end', { targetSocketId: callerSocketId.current });
            endCall();
          }}
          callerSocketId={callerSocketId}
          incomingData={incomingCall}
          isScreenSharing={isScreenSharing}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
        />
      )}

      {callState === 'ringing' && incomingCall && (
        <div style={styles.incomingCallBanner}>
          <span>{incomingCall.callerUsername} звонит...</span>
          <button onClick={() => acceptCall(incomingCall, true)} style={styles.acceptBtn}>Принять</button>
          <button onClick={() => { rejectCall(incomingCall); setIncomingCall(null); }} style={styles.rejectBtn}>Отклонить</button>
        </div>
      )}
    </>
  );
}

const styles = {
  chat: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f131c',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sidebar: {
    width: '350px',
    background: '#171c29',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '85%',
    maxWidth: '320px',
    height: '100%',
    background: '#171c29',
    zIndex: 200,
    transition: 'transform 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarInner: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 199,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: '#0e1621',
  },
  welcomeIcon: {
    fontSize: '48px',
  },
  welcomeTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#fff',
  },
  welcomeText: {
    fontSize: '14px',
    color: '#70798a',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: '#0f131c',
    color: '#70798a',
    fontSize: '16px',
  },
  incomingCallBanner: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    left: '20px',
    background: '#171c29',
    padding: '16px 24px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    zIndex: 999,
    color: '#fff',
    fontSize: '14px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  acceptBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#34c759',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  rejectBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#ff595a',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
};
