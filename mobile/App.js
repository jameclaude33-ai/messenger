import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth, useE2E, useChat, useGroups } from './src/hooks/useChat';
import AuthScreen from './src/screens/AuthScreen';
import ChatScreen from './src/screens/ChatScreen';
import GroupsScreen from './src/screens/GroupsScreen';

export default function App() {
  const { user, token, loading, register, login, logout } = useAuth();
  const { keyPair: e2eKeyPair, ready: e2eReady } = useE2E(token);
  const { messages, users, connected, joined, join, sendMessage } = useChat(token, e2eKeyPair, e2eReady);
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
  } = useGroups();

  useEffect(() => {
    if (user && token && !joined) {
      join();
    }
  }, [user, token, joined]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!user || !token) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen onLogin={login} onRegister={register} />
      </>
    );
  }

  if (activeGroupId) {
    return (
      <>
        <StatusBar style="light" />
        <GroupsScreen
          groups={groups}
          activeGroupId={activeGroupId}
          groupMessages={groupMessages}
          username={user.username}
          onCreate={createGroup}
          onJoin={joinGroup}
          onLeave={leaveGroup}
          onSelect={selectGroup}
          onSendMessage={sendGroupMessage}
          onBack={deselectGroup}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        <ChatScreen
          messages={messages}
          username={user.username}
          onSend={sendMessage}
          onLogout={logout}
          e2eReady={e2eReady}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
