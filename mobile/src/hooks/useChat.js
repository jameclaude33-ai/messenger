import { useState, useEffect, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { getOrCreateKeyPair, publishPublicKey, encryptMsg, decryptMsg, getSharedKey, clearKeyCache } from '../utils/e2e-crypto';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const storedToken = await AsyncStorage.getItem('messenger_token');
      const storedUser = await AsyncStorage.getItem('messenger_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to load auth:', err);
    } finally {
      setLoading(false);
    }
  }

  async function register(username, password, displayName) {
    const { register: apiRegister } = await import('../services/api');
    const data = await apiRegister(username, password, displayName);
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('messenger_token', data.token);
    await AsyncStorage.setItem('messenger_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function login(username, password) {
    const { login: apiLogin } = await import('../services/api');
    const data = await apiLogin(username, password);
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('messenger_token', data.token);
    await AsyncStorage.setItem('messenger_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem('messenger_token');
    await AsyncStorage.removeItem('messenger_user');
    clearKeyCache();
    setToken(null);
    setUser(null);
  }

  return { user, token, loading, register, login, logout };
}

export function useE2E(token) {
  const [keyPair, setKeyPair] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const kp = await getOrCreateKeyPair();
        setKeyPair(kp);
        await publishPublicKey(kp.publicKey, token);
        const socket = getSocket();
        if (socket) {
          socket.emit('e2e:publish-key', { publicKey: kp.publicKey });
        }
        setReady(true);
      } catch (err) {
        console.error('E2E init failed:', err);
      }
    })();
  }, [token]);

  return { keyPair, ready };
}

export function useChat(token, e2eKeyPair, e2eReady) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('message:new', async (message) => {
      if (message.encrypted && e2eKeyPair) {
        try {
          const sharedKey = await getSharedKey(e2eKeyPair, message.username, token);
          if (sharedKey) {
            const text = await decryptMsg(sharedKey, message.ciphertext, message.iv);
            setMessages((prev) => [...prev, { ...message, text }]);
          } else {
            setMessages((prev) => [...prev, { ...message, text: '[Не удалось расшифровать]' }]);
          }
        } catch {
          setMessages((prev) => [...prev, { ...message, text: '[Ошибка расшифровки]' }]);
        }
      } else {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('message:history', async (history) => {
      if (e2eKeyPair) {
        const decrypted = await Promise.all(
          history.map(async (msg) => {
            if (!msg.encrypted) return msg;
            try {
              const sharedKey = await getSharedKey(e2eKeyPair, msg.username, token);
              if (sharedKey) {
                const text = await decryptMsg(sharedKey, msg.ciphertext, msg.iv);
                return { ...msg, text };
              }
            } catch {}
            return { ...msg, text: '[Ошибка расшифровки]' };
          })
        );
        setMessages(decrypted);
      } else {
        setMessages(history);
      }
    });

    socket.on('user:list', (userList) => {
      setUsers(userList);
    });

    return () => {
      disconnectSocket();
    };
  }, [token, e2eKeyPair]);

  const join = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('message:history');
    setJoined(true);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const socket = getSocket();
    if (!socket || !text.trim()) return;
    if (e2eReady && e2eKeyPair) {
      const sharedKey = await getSharedKey(e2eKeyPair, 'general-chat', token);
      if (sharedKey) {
        const { ciphertext, iv } = await encryptMsg(sharedKey, text);
        socket.emit('message:send', { encrypted: true, ciphertext, iv });
        return;
      }
    }
    socket.emit('message:send', { text });
  }, [e2eKeyPair, e2eReady, token]);

  return { messages, users, connected, joined, join, sendMessage };
}

export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('group:created', (group) => {
      setGroups((prev) => {
        if (prev.find((g) => g.id === group.id)) return prev;
        return [...prev, group];
      });
    });

    socket.on('group:list', (groupList) => {
      setGroups(groupList);
    });

    socket.on('group:message:new', (message) => {
      setGroupMessages((prev) => [...prev, message]);
    });

    socket.on('group:messages', (messages) => {
      setGroupMessages(messages);
    });

    socket.emit('group:list');

    return () => {
      socket.off('group:created');
      socket.off('group:list');
      socket.off('group:message:new');
      socket.off('group:messages');
    };
  }, []);

  const createGroup = useCallback((name) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('group:create', { name });
  }, []);

  const joinGroup = useCallback((groupId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('group:join', groupId);
  }, []);

  const leaveGroup = useCallback((groupId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('group:leave', groupId);
    if (activeGroupId === groupId) {
      setActiveGroupId(null);
      setGroupMessages([]);
    }
  }, [activeGroupId]);

  const selectGroup = useCallback((groupId) => {
    setActiveGroupId(groupId);
    setGroupMessages([]);
    const socket = getSocket();
    if (socket) {
      socket.emit('group:messages', groupId);
    }
  }, []);

  const sendGroupMessage = useCallback((text) => {
    const socket = getSocket();
    if (!socket || !activeGroupId) return;
    socket.emit('group:message:send', { groupId: activeGroupId, text });
  }, [activeGroupId]);

  const deselectGroup = useCallback(() => {
    setActiveGroupId(null);
    setGroupMessages([]);
  }, []);

  return {
    groups,
    activeGroupId,
    groupMessages,
    createGroup,
    joinGroup,
    leaveGroup,
    selectGroup,
    sendGroupMessage,
    deselectGroup,
  };
}
