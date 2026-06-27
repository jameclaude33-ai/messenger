import { useState, useEffect, useCallback } from 'react';
import { getSharedKey, encryptMessage, decryptMessage } from '../utils/e2e-crypto';

export function usePrivateChats(socket, e2eKeyPair, e2eReady, token) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
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

    socket.emit('private:chats');

    return () => {
      socket.off('private:chats');
      socket.off('private:message');
      socket.off('private:history');
    };
  }, [socket, activeChat]);

  const openChat = useCallback((username) => {
    setActiveChat(username);
    setMessages([]);
    if (socket) {
      socket.emit('private:history', { with: username });
    }
  }, [socket]);

  const closeChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
  }, []);

  const sendPrivateMessage = useCallback(async (text) => {
    if (!socket || !activeChat || !text.trim()) return;
    if (e2eReady && e2eKeyPair) {
      try {
        const sharedKey = await getSharedKey(e2eKeyPair, activeChat, token);
        if (sharedKey) {
          const { ciphertext, iv } = await encryptMessage(sharedKey, text);
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
  }, [socket, activeChat, e2eKeyPair, e2eReady, token]);

  const decryptMessage_ = useCallback(async (msg) => {
    if (!msg.encrypted || !e2eKeyPair) return msg;
    try {
      const sharedKey = await getSharedKey(e2eKeyPair, msg.from, token);
      if (!sharedKey) return { ...msg, text: '[Не удалось расшифровать]' };
      const text = await decryptMessage(sharedKey, msg.ciphertext, msg.iv);
      return { ...msg, text };
    } catch {
      return { ...msg, text: '[Ошибка расшифровки]' };
    }
  }, [e2eKeyPair, token]);

  return {
    chats,
    activeChat,
    messages,
    openChat,
    closeChat,
    sendPrivateMessage,
    decryptMessage: decryptMessage_,
  };
}
