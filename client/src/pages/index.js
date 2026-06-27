import GlobalStyles from '../styles/global';
import { useAuth, useSocket, useE2E, useChat, useGroups, useP2PCall } from '../hooks/useChat';
import AuthScreen from '../components/AuthScreen';
import ChatHeader from '../components/ChatHeader';
import UserList from '../components/UserList';
import GroupList from '../components/GroupList';
import GroupChat from '../components/GroupChat';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import CallModal from '../components/CallModal';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, token, loading, register, login, logout } = useAuth();
  const { socket, connected } = useSocket(token);
  const { keyPair: e2eKeyPair, ready: e2eReady } = useE2E(socket, token);
  const { messages, users, joined, join, sendMessage, sendFileMessage } = useChat(socket, e2eKeyPair, e2eReady);
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
    callState,
    remoteUsername: callRemoteUsername,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    callerSocketId,
  } = useP2PCall(socket, user?.username);
  const [sidebarTab, setSidebarTab] = useState('users');
  const [showSidebar, setShowSidebar] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', (data) => {
      setIncomingCall(data);
    });

    return () => {
      socket.off('call:incoming');
    };
  }, [socket]);

  useEffect(() => {
    if (user && token && socket && !joined) {
      join();
    }
  }, [user, token, socket, joined, join]);

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

  return (
    <>
      <GlobalStyles />
      <div style={styles.chat}>
        <ChatHeader
          username={user.username}
          connected={connected}
          e2eReady={e2eReady}
          onDisconnect={logout}
        />
        <div style={styles.body}>
          {showSidebar && (
            <div style={styles.sidebar}>
              <div style={styles.tabs}>
                <button
                  onClick={() => setSidebarTab('users')}
                  style={{
                    ...styles.tab,
                    borderBottom: sidebarTab === 'users' ? '2px solid #4f46e5' : '2px solid transparent',
                    color: sidebarTab === 'users' ? '#fff' : '#666',
                  }}
                >
                  Чаты
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
              {sidebarTab === 'users' ? (
                <UserList
                  users={users}
                  username={user.username}
                  onCall={initiateCall}
                />
              ) : (
                <GroupList
                  groups={groups}
                  onJoin={joinGroup}
                  onCreate={createGroup}
                  activeGroupId={activeGroupId}
                  onSelect={selectGroup}
                />
              )}
            </div>
          )}
          <div style={styles.main}>
            {activeGroup ? (
              <GroupChat
                group={activeGroup}
                messages={groupMessages}
                username={user.username}
                onSendMessage={sendGroupMessage}
                onLeave={() => leaveGroup(activeGroupId)}
                onBack={deselectGroup}
              />
            ) : (
              <>
                <MessageList messages={messages} username={user.username} />
                <MessageInput
                  onSend={sendMessage}
                  onFileUpload={sendFileMessage}
                  userId={user.username}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {callState !== 'idle' && (
        <CallModal
          callState={callState}
          remoteUsername={callRemoteUsername}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={() => acceptCall(incomingCall)}
          onReject={() => rejectCall(incomingCall)}
          onEnd={endCall}
          callerSocketId={callerSocketId}
          incomingData={incomingCall}
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
    height: '100vh',
    background: '#0f0f0f',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    background: '#1a1a1a',
    borderRight: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #2a2a2a',
  },
  tab: {
    flex: 1,
    padding: '14px',
    background: 'transparent',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f0f0f',
    color: '#888',
    fontSize: '16px',
  },
  incomingCallBanner: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#1a1a1a',
    padding: '16px 24px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
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
