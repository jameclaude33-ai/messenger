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
import { subscribeToPush, requestNotificationPermission } from '../utils/push';

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

  useEffect(() => {
    if (!token) return;
    requestNotificationPermission().then((granted) => {
      if (granted) {
        subscribeToPush(token).then((ok) => {
          console.log('Push subscription on auth:', ok);
        });
      }
    });

    const interval = setInterval(() => {
      if (Notification.permission === 'granted') {
        subscribeToPush(token).catch(() => {});
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token]);

  const register = async (data) => {
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

    newSocket.on('connect', () => {
      setConnected(true);
      setTimeout(() => {
        subscribeToPush(token).catch(() => {});
      }, 1000);
    });
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

export function useChat(socket, e2eKeyPair, e2eReady, user) {
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
      if (!message.system && message.username !== user?.username && document.hidden && Notification.permission === 'granted') {
        new Notification(message.username || 'Messenger', {
          body: message.text || 'Новое сообщение',
          icon: '/favicon.ico',
          tag: 'msg-' + message.id,
        });
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
  const [callState, setCallStateRaw] = useState('idle');
  const [remoteUsername, setRemoteUsername] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const peerConnection = useRef(null);
  const callerSocketId = useRef(null);
  const pendingCandidates = useRef([]);
  const localStreamRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const callIdRef = useRef(0);
  const callStateRef = useRef('idle');
  const screenStreamRef = useRef(null);
  const originalVideoTrackRef = useRef(null);

  const setCallState = useCallback((val) => {
    callStateRef.current = val;
    setCallStateRaw(val);
  }, []);

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
      const stream = event.streams[0];
      stream.onremovetrack = () => {
        setRemoteStream(new MediaStream(stream.getTracks()));
      };
      stream.onaddtrack = () => {
        setRemoteStream(new MediaStream(stream.getTracks()));
      };
      setRemoteStream(stream);
    };

    return pc;
  }, [socket]);

  const flushPendingCandidates = useCallback((targetSocketId) => {
    pendingCandidates.current.forEach((candidate) => {
      socket.emit('call:ice-candidate', { targetSocketId, candidate });
    });
    pendingCandidates.current = [];
  }, [socket]);

  const initiateCall = async (targetUsername, withVideo = false) => {
    const callId = ++callIdRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      if (callId !== callIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState('calling');
      setRemoteUsername(targetUsername);
      pendingCandidates.current = [];

      const pc = createPeerConnection(null);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      if (callId !== callIdRef.current) return;
      await pc.setLocalDescription(offer);
      peerConnection.current = pc;

      socket.emit('call:initiate', { targetUsername, offer });

      callTimeoutRef.current = setTimeout(() => {
        socket.emit('call:end', {});
        endCall();
      }, 30000);
    } catch (err) {
      console.error('Failed to initiate call:', err);
      if (callId === callIdRef.current) endCall();
    }
  };

  const acceptCall = async (data, withVideo = false) => {
    const callId = ++callIdRef.current;
    try {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      if (callId !== callIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
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
      if (callId === callIdRef.current) endCall();
    }
  };

  const rejectCall = (data) => {
    socket.emit('call:reject', { callerSocketId: data.callerSocketId });
    endCall();
  };

  const endCall = useCallback(() => {
    callIdRef.current += 1;
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUsername(null);
    setIsScreenSharing(false);
    callerSocketId.current = null;
    pendingCandidates.current = [];
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!peerConnection.current || !localStreamRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;
      const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        originalVideoTrackRef.current = sender.track;
        await sender.replaceTrack(screenTrack);
      }
      setIsScreenSharing(true);
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Screen share failed:', err);
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!peerConnection.current || !screenStreamRef.current) return;
    try {
      const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && originalVideoTrackRef.current) {
        await sender.replaceTrack(originalVideoTrackRef.current);
        originalVideoTrackRef.current = null;
      }
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Stop screen share failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', (data) => {
      if (callStateRef.current !== 'idle') {
        endCall();
      }
      setCallState('ringing');
      setRemoteUsername(data.callerUsername);
      callerSocketId.current = data.callerSocketId;
      pendingCandidates.current = [];
    });

    socket.on('call:accepted', async (data) => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
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

    socket.on('call:busy', () => {
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
      socket.off('call:busy');
      socket.off('call:ice-candidate');
      socket.off('call:error');
    };
  }, [socket]);

  return {
    callState,
    remoteUsername,
    localStream,
    remoteStream,
    isScreenSharing,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    startScreenShare,
    stopScreenShare,
    callerSocketId: callerSocketId.current,
  };
}
