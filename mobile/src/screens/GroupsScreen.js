import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';

export default function GroupsScreen({
  groups,
  activeGroupId,
  groupMessages,
  username,
  onCreate,
  onJoin,
  onLeave,
  onSelect,
  onSendMessage,
  onBack,
}) {
  const [newGroupName, setNewGroupName] = useState('');
  const [messageText, setMessageText] = useState('');

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreate(newGroupName);
    setNewGroupName('');
  };

  const handleSend = () => {
    if (!messageText.trim() || !activeGroupId) return;
    onSendMessage(messageText);
    setMessageText('');
  };

  if (activeGroupId) {
    const group = groups.find((g) => g.id === activeGroupId);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.back}>← Назад</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{group?.name || 'Группа'}</Text>
          <TouchableOpacity onPress={() => onLeave(activeGroupId)}>
            <Text style={styles.leave}>Выйти</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={groupMessages}
          renderItem={({ item }) => {
            if (item.system) {
              return (
                <View style={styles.systemMessage}>
                  <Text style={styles.systemText}>{item.text}</Text>
                </View>
              );
            }
            const isOwn = item.username === username;
            return (
              <View style={[styles.message, isOwn ? styles.ownMessage : styles.otherMessage]}>
                {!isOwn && <Text style={styles.username}>{item.username}</Text>}
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Сообщение..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Группы</Text>
      </View>

      <View style={styles.createContainer}>
        <TextInput
          style={styles.createInput}
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder="Название группы..."
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createText}>Создать</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupItem}
            onPress={() => onSelect(item.id)}
          >
            <View style={styles.groupAvatar}>
              <Text style={styles.groupAvatarText}>
                {item.name[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupMembers}>
                {item.memberCount || 0} участников
              </Text>
            </View>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => onJoin(item.id)}
            >
              <Text style={styles.joinText}>Вступить</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
  back: {
    color: '#4f46e5',
    fontSize: 14,
  },
  leave: {
    color: '#ef4444',
    fontSize: 14,
  },
  createContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  createInput: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  createText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 8,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  groupMembers: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  joinButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
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
  username: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemText: {
    color: '#666',
    fontSize: 12,
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
