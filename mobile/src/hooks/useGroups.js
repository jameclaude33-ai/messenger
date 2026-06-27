import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';

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
