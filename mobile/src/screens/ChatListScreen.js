import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

export default function ChatListScreen({ chats, username, onSelectChat, onLogout }) {
  const [newChat, setNewChat] = useState('');

  const handleStartChat = () => {
    const target = newChat.trim();
    if (target && target !== username) {
      onSelectChat(target);
      setNewChat('');
    }
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => onSelectChat(item.otherUser)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.otherUser[0].toUpperCase()}</Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.nameRow}>
          <View>
            <Text style={styles.chatName}>{item.otherUserDisplayName || item.otherUser}</Text>
            <Text style={styles.chatTag}>@{item.otherUser}</Text>
          </View>
          {item.lastMessage && (
            <Text style={styles.chatTime}>
              {new Date(item.lastMessage.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
        {item.lastMessage && (
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.lastMessage.from === username && 'Вы: '}
            {item.lastMessage.encrypted ? '🔒 Сообщение' : (item.lastMessage.text || '')}
          </Text>
        )}
      </View>
      {item.unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messenger</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Новый чат — никнейм..."
          placeholderTextColor="#666"
          value={newChat}
          onChangeText={setNewChat}
          onSubmitEditing={handleStartChat}
          returnKeyType="send"
        />
        {newChat.trim() && newChat.trim() !== username && (
          <TouchableOpacity style={styles.searchBtn} onPress={handleStartChat}>
            <Text style={styles.searchBtnText}>→</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.chatId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет чатов. Введите никнейм выше, чтобы начать.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  logout: {
    color: '#ef4444',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3390ec',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 12,
  },
  empty: {
    color: '#70798a',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3390ec',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  chatTag: {
    color: '#70798a',
    fontSize: 11,
  },
  chatTime: {
    color: '#70798a',
    fontSize: 11,
  },
  chatPreview: {
    color: '#70798a',
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#3390ec',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
