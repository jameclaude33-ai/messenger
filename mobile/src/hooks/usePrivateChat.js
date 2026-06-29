import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { getSharedKey, encryptMsg, decryptMsg } from '../utils/e2e-crypto';

export function usePrivateChats(token, e2eKeyPair, e2eReady, username) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('private:chats', (chatList) => {
      setChats(chatList);
    });

    socket.on('private:message', (message) => {
      if (activeChat && (message.from === activeChat || message.to === activeChat)) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      socket.emit('private:chats');
    });

    socket.on('private:history', (history) => {
      setMessages(history);
    });

    socket.on('private:read', (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id) ? { ...m, read: true } : m
        )
      );
    });

    socket.on('private:typing', (data) => {
      setTypingUsers((prev) => ({ ...prev, [data.from]: true }));
    });

    socket.on('private:stopTyping', (data) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[data.from];
        return next;
      });
    });

    socket.emit('private:chats');

    return () => {
      socket.off('private:chats');
      socket.off('private:message');
      socket.off('private:history');
      socket.off('private:read');
      socket.off('private:typing');
      socket.off('private:stopTyping');
    };
  }, [activeChat]);

  const openChat = useCallback((targetUsername) => {
    setActiveChat(targetUsername);
    setMessages([]);
    setTypingUsers({});
    const socket = getSocket();
    if (socket) {
      socket.emit('private:history', { with: targetUsername });
    }
  }, []);

  const closeChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
  }, []);

  const sendPrivateMessage = useCallback(async (text) => {
    const socket = getSocket();
    if (!socket || !activeChat || !text.trim()) return;
    if (e2eReady && e2eKeyPair) {
      try {
        const sharedKey = await getSharedKey(e2eKeyPair, activeChat, token);
        if (sharedKey) {
          const { ciphertext, iv } = await encryptMsg(sharedKey, text);
          socket.emit('private:send', {
            to: activeChat,
            encrypted: true,
            ciphertext,
            iv,
          });
          return;
        }
      } catch (err) {
        console.error('E2E encrypt failed, sending plain:', err);
      }
    }
    socket.emit('private:send', { to: activeChat, text });
  }, [activeChat, e2eKeyPair, e2eReady, token]);

  const decryptMessage = useCallback(async (msg) => {
    if (!msg.encrypted || !e2eKeyPair) return msg;
    try {
      const otherUser = msg.from === username ? msg.to : msg.from;
      const sharedKey = await getSharedKey(e2eKeyPair, otherUser, token);
      if (!sharedKey) return { ...msg, text: '[Не удалось расшифровать]' };
      const text = await decryptMsg(sharedKey, msg.ciphertext, msg.iv);
      return { ...msg, text };
    } catch {
      return { ...msg, text: '[Ошибка расшифровки]' };
    }
  }, [e2eKeyPair, token, username]);

  return {
    chats,
    activeChat,
    messages,
    openChat,
    closeChat,
    sendPrivateMessage,
    decryptMessage,
    typingUsers,
  };
}
