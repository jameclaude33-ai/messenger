import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function PrivateChatScreen({ messages, username, otherUser, onSend, onBack, decryptMessage, isTyping, onTyping, onStopTyping }) {
  const [text, setText] = useState('');
  const [decryptedMessages, setDecryptedMessages] = useState([]);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!decryptMessage || !messages.length) {
      setDecryptedMessages(messages);
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(messages.map(decryptMessage));
      if (!cancelled) setDecryptedMessages(results);
    })();
    return () => { cancelled = true; };
  }, [messages, decryptMessage]);

  useEffect(() => {
    if (flatListRef.current && decryptedMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [decryptedMessages, isTyping]);

  const handleTyping = useCallback(() => {
    if (onTyping) onTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onStopTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
      }, 2000);
    }
  }, [onTyping, onStopTyping]);

  const handleSend = () => {
    if (!text.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onStopTyping) onStopTyping();
    onSend(text);
    setText('');
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.from === username;
    return (
      <View style={[styles.message, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <View style={styles.msgInfo}>
          <Text style={styles.time}>
            {new Date(item.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isOwn && (
            <Text style={[styles.ticks, { color: item.read ? '#53a6f3' : 'rgba(255,255,255,0.4)' }]}>
              {item.read ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isTyping) return null;
    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>{otherUser} печатает...</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{otherUser[0].toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUser}</Text>
          <Text style={styles.e2e}>🔒 E2E</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={decryptedMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        ListFooterComponent={renderFooter}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(val) => { setText(val); handleTyping(); }}
          placeholder="Сообщение..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backBtn: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 22,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  e2e: {
    color: '#22c55e',
    fontSize: 11,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  msgInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  time: {
    color: '#888',
    fontSize: 11,
  },
  ticks: {
    fontSize: 13,
    letterSpacing: -1,
  },
  typingContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  typingText: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
