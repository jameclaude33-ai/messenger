import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import {
  getOrCreateKeyPair,
  publishPublicKey,
  encryptMessage,
  decryptMessage,
  getSharedKey,
  clearKeyCache,
} from '../utils/e2e-crypto';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3001';
};

const SOCKET_URL = getBaseUrl();
const API_URL = getBaseUrl();

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('messenger_token');
    const savedUser = localStorage.getItem('messenger_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const register = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('messenger_token', data.token);
    localStorage.setItem('messenger_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('messenger_token', data.token);
    localStorage.setItem('messenger_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('messenger_token');
    localStorage.removeItem('messenger_user');
    clearKeyCache();
    setToken(null);
    setUser(null);
  };

  return { user, token, loading, register, login, logout };
}

export function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, connected };
}

export function useE2E(socket, token) {
  const [keyPair, setKeyPair] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const kp = await getOrCreateKeyPair();
        setKeyPair(kp);
        await publishPublicKey(kp.publicKey, token);
        setReady(true);
      } catch (err) {
        console.error('E2E init failed:', err);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!socket || !keyPair) return;
    const onConnect = () => {
      socket.emit('e2e:publish-key', { publicKey: keyPair.publicKey });
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [socket, keyPair]);

  return { keyPair, ready };
}

export function useChat(socket, e2eKeyPair, e2eReady) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [joined, setJoined] = useState(false);

  const decryptMsg = useCallback(async (msg) => {
    if (!msg.encrypted || !e2eKeyPair) return msg;
    try {
      const sharedKey = await getSharedKey(e2eKeyPair, msg.username, null);
      if (!sharedKey) return { ...msg, text: '[Не удалось расшифровать — ключ не найден]' };
      const text = await decryptMessage(sharedKey, msg.ciphertext, msg.iv);
      return { ...msg, text };
    } catch (err) {
      return { ...msg, text: '[Ошибка расшифровки]' };
    }
  }, [e2eKeyPair]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (message) => {
      if (message.encrypted && e2eKeyPair) {
        const decrypted = await decryptMsg(message);
        setMessages((prev) => [...prev, decrypted]);
      } else {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleHistory = async (history) => {
      if (e2eKeyPair) {
        const decrypted = await Promise.all(history.map(decryptMsg));
        setMessages(decrypted);
      } else {
        setMessages(history);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:history', handleHistory);
    socket.on('user:list', (userList) => setUsers(userList));

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:history', handleHistory);
      socket.off('user:list');
    };
  }, [socket, e2eKeyPair, decryptMsg]);

  const join = useCallback(() => {
    if (!socket) return;
    socket.emit('message:history');
    socket.emit('user:list');
    setJoined(true);
  }, [socket]);

  const sendMessage = useCallback(async (text) => {
    if (!socket || !text.trim()) return;
    if (e2eReady && e2eKeyPair) {
      const sharedKey = await getSharedKey(e2eKeyPair, 'general-chat', null);
      if (sharedKey) {
        const { ciphertext, iv } = await encryptMessage(sharedKey, text);
        socket.emit('message:send', { encrypted: true, ciphertext, iv });
        return;
      }
    }
    socket.emit('message:send', { text });
  }, [socket, e2eKeyPair, e2eReady]);

  const sendFileMessage = (fileData) => {
    if (!socket) return;
    socket.emit('message:send', {
      text: `Файл: ${fileData.originalName}`,
      file: fileData,
    });
  };

  return { messages, users, joined, join, sendMessage, sendFileMessage };
}

export function useGroups(socket) {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('group:created', (group) => {
      setGroups((prev) => {
        if (prev.find((g) => g.id === group.id)) return prev;
        return [...prev, group];
      });
    });

    socket.on('group:updated', (group) => {
      setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
    });

    socket.on('group:list', (groupList) => {
      setGroups(groupList);
    });

    socket.on('group:message:new', (message) => {
      if (message.groupId === activeGroupId) {
        setGroupMessages((prev) => [...prev, message]);
      }
    });

    socket.on('group:messages', (messages) => {
      setGroupMessages(messages);
    });

    socket.emit('group:list');

    return () => {
      socket.off('group:created');
      socket.off('group:updated');
      socket.off('group:list');
      socket.off('group:message:new');
      socket.off('group:messages');
    };
  }, [socket, activeGroupId]);

  const createGroup = (name) => {
    if (!socket) return;
    socket.emit('group:create', { name });
  };

  const joinGroup = (groupId) => {
    if (!socket) return;
    socket.emit('group:join', groupId);
  };

  const leaveGroup = (groupId) => {
    if (!socket) return;
    socket.emit('group:leave', groupId);
    if (activeGroupId === groupId) {
      setActiveGroupId(null);
      setGroupMessages([]);
    }
  };

  const selectGroup = (groupId) => {
    setActiveGroupId(groupId);
    setGroupMessages([]);
    if (socket) {
      socket.emit('group:messages', groupId);
    }
  };

  const sendGroupMessage = (text) => {
    if (!socket || !activeGroupId) return;
    socket.emit('group:message:send', { groupId: activeGroupId, text });
  };

  const deselectGroup = () => {
    setActiveGroupId(null);
    setGroupMessages([]);
  };

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

export function useP2PCall(socket, username) {
  const [callState, setCallState] = useState('idle');
  const [remoteUsername, setRemoteUsername] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);
  const callerSocketId = useRef(null);
  const pendingCandidates = useRef([]);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const createPeerConnection = useCallback((targetSocketId) => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (targetSocketId) {
          socket.emit('call:ice-candidate', {
            targetSocketId,
            candidate: event.candidate,
          });
        } else {
          pendingCandidates.current.push(event.candidate);
        }
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  }, [socket]);

  const flushPendingCandidates = useCallback((targetSocketId) => {
    pendingCandidates.current.forEach((candidate) => {
      socket.emit('call:ice-candidate', { targetSocketId, candidate });
    });
    pendingCandidates.current = [];
  }, [socket]);

  const initiateCall = async (targetUsername) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      setCallState('calling');
      setRemoteUsername(targetUsername);
      pendingCandidates.current = [];

      const pc = createPeerConnection(null);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      peerConnection.current = pc;

      socket.emit('call:initiate', { targetUsername, offer });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setCallState('idle');
    }
  };

  const acceptCall = async (data) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      setCallState('connected');
      callerSocketId.current = data.callerSocketId;

      const pc = createPeerConnection(data.callerSocketId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      peerConnection.current = pc;

      socket.emit('call:accept', {
        callerSocketId: data.callerSocketId,
        answer,
      });

      flushPendingCandidates(data.callerSocketId);
    } catch (err) {
      console.error('Failed to accept call:', err);
      setCallState('idle');
    }
  };

  const rejectCall = (data) => {
    socket.emit('call:reject', { callerSocketId: data.callerSocketId });
    setCallState('idle');
    setRemoteUsername(null);
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUsername(null);
    callerSocketId.current = null;
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', (data) => {
      setCallState('ringing');
      setRemoteUsername(data.callerUsername);
      callerSocketId.current = data.callerSocketId;
    });

    socket.on('call:accepted', async (data) => {
      setCallState('connected');
      callerSocketId.current = data.responderSocketId;
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
      flushPendingCandidates(data.responderSocketId);
    });

    socket.on('call:rejected', () => {
      endCall();
    });

    socket.on('call:ended', () => {
      endCall();
    });

    socket.on('call:ice-candidate', async (data) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (err) {
          console.error('Failed to add ICE candidate:', err);
        }
      }
    });

    socket.on('call:cancelled', () => {
      endCall();
    });

    socket.on('call:busy', (data) => {
      endCall();
    });

    socket.on('call:error', (data) => {
      console.error('Call error:', data.message);
      endCall();
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:cancelled');
      socket.off('call:busy');
      socket.off('call:ice-candidate');
      socket.off('call:error');
    };
  }, [socket, localStream]);

  return {
    callState,
    remoteUsername,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    callerSocketId: callerSocketId.current,
  };
}
