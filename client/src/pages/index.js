import GlobalStyles from '../styles/global';
import { useAuth, useSocket, useE2E, useChat, useGroups, useP2PCall } from '../hooks/useChat';
import { usePrivateChats } from '../hooks/usePrivateChat';
import AuthScreen from '../components/AuthScreen';
import ChatHeader from '../components/ChatHeader';
import UserList from '../components/UserList';
import GroupList from '../components/GroupList';
import ChatList from '../components/ChatList';
import PrivateChat from '../components/PrivateChat';
import GroupChat from '../components/GroupChat';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import CallModal from '../components/CallModal';
import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  const { user, token, loading, register, login, logout } = useAuth();
  const { socket, connected } = useSocket(token);
  const { keyPair: e2eKeyPair, ready: e2eReady } = useE2E(socket, token);
  const { messages, users, joined, join, sendMessage, sendFileMessage } = useChat(socket, e2eKeyPair, e2eReady, user);
  const {
    groups,
    activeGroupId,
    groupMessages,
    createGroup,
    joinGroup,
    leaveGroup,
    selectGroup,
    sendGroupMessage,
    deselectGroup,
  } = useGroups(socket);
  const {
    chats,
    activeChat,
    messages: privateMessages,
    openChat,
    closeChat,
    sendPrivateMessage,
    decryptMessage: decryptPrivateMessage,
  } = usePrivateChats(socket, e2eKeyPair, e2eReady, token, user);
  const {
    callState,
    remoteUsername: callRemoteUsername,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    startScreenShare,
    stopScreenShare,
    callerSocketId,
  } = useP2PCall(socket, user?.username);
  const [sidebarTab, setSidebarTab] = useState('chats');
  const [showSidebar, setShowSidebar] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

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

  const handleSelectGroup = useCallback((id) => {
    selectGroup(id);
    if (isMobile) setShowSidebar(false);
  }, [selectGroup, isMobile]);

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
      <div style={styles.tabs}>
        <button
          onClick={() => setSidebarTab('chats')}
          style={{
            ...styles.tab,
            borderBottom: sidebarTab === 'chats' ? '2px solid #4f46e5' : '2px solid transparent',
            color: sidebarTab === 'chats' ? '#fff' : '#666',
          }}
        >
          Чаты
        </button>
        <button
          onClick={() => setSidebarTab('users')}
          style={{
            ...styles.tab,
            borderBottom: sidebarTab === 'users' ? '2px solid #4f46e5' : '2px solid transparent',
            color: sidebarTab === 'users' ? '#fff' : '#666',
          }}
        >
          Люди
        </button>
        <button
          onClick={() => setSidebarTab('groups')}
          style={{
            ...styles.tab,
            borderBottom: sidebarTab === 'groups' ? '2px solid #4f46e5' : '2px solid transparent',
            color: sidebarTab === 'groups' ? '#fff' : '#666',
          }}
        >
          Группы
        </button>
      </div>
      {sidebarTab === 'chats' && (
        <ChatList chats={chats} activeChat={activeChat} onSelect={handleOpenChat} username={user.username} />
      )}
      {sidebarTab === 'users' && (
        <UserList users={users} username={user.username} onCall={(u) => initiateCall(u, false)} onVideoCall={(u) => initiateCall(u, true)} onChat={handleOpenChat} />
      )}
      {sidebarTab === 'groups' && (
        <GroupList groups={groups} onJoin={joinGroup} onCreate={createGroup} activeGroupId={activeGroupId} onSelect={handleSelectGroup} />
      )}
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
        />
      );
    }
    if (activeGroup) {
      return (
        <GroupChat
          group={activeGroup}
          messages={groupMessages}
          username={user.username}
          onSendMessage={sendGroupMessage}
          onLeave={() => leaveGroup(activeGroupId)}
          onBack={deselectGroup}
        />
      );
    }
    return (
      <>
        <MessageList messages={messages} username={user.username} />
        <MessageInput onSend={sendMessage} onFileUpload={sendFileMessage} userId={user.username} />
      </>
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
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
        />
      )}

      {callState === 'ringing' && incomingCall && (
        <div style={styles.incomingCallBanner}>
          <span>{incomingCall.callerUsername} звонит...</span>
          <button onClick={() => acceptCall(incomingCall)} style={styles.acceptBtn}>Принять</button>
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
    height: '100dvh',
    background: '#0f0f0f',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sidebar: {
    width: '300px',
    background: '#1a1a1a',
    borderRight: '1px solid #2a2a2a',
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
    background: '#1a1a1a',
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
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #2a2a2a',
  },
  tab: {
    flex: 1,
    padding: '12px 8px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100dvh',
    background: '#0f0f0f',
    color: '#888',
    fontSize: '16px',
  },
  incomingCallBanner: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    left: '20px',
    background: '#1a1a1a',
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
  },
  acceptBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  rejectBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
};
