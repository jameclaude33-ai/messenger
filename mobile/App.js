import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth, useE2E, useChat } from './src/hooks/useChat';
import { usePrivateChats } from './src/hooks/usePrivateChat';
import AuthScreen from './src/screens/AuthScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import PrivateChatScreen from './src/screens/PrivateChatScreen';

export default function App() {
  const { user, token, loading, register, login, logout } = useAuth();
  const { keyPair: e2eKeyPair, ready: e2eReady } = useE2E(token);
  const { joined, join } = useChat(token, e2eKeyPair, e2eReady);
  const {
    chats,
    activeChat,
    messages: privateMessages,
    openChat,
    closeChat,
    sendPrivateMessage,
    decryptMessage,
    typingUsers,
  } = usePrivateChats(token, e2eKeyPair, e2eReady, user?.username);

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

  if (activeChat) {
    return (
      <>
        <StatusBar style="light" />
        <PrivateChatScreen
          messages={privateMessages}
          username={user.username}
          otherUser={activeChat}
          onSend={sendPrivateMessage}
          onBack={closeChat}
          decryptMessage={decryptMessage}
          isTyping={Object.keys(typingUsers).length > 0}
          onTyping={() => {
            const socket = require('./src/services/socket').getSocket();
            socket?.emit('private:typing', { to: activeChat });
          }}
          onStopTyping={() => {
            const socket = require('./src/services/socket').getSocket();
            socket?.emit('private:stopTyping', { to: activeChat });
          }}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <ChatListScreen
        chats={chats}
        username={user.username}
        onSelectChat={openChat}
        onLogout={logout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
