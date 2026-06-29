const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { encrypt, decrypt } = require('./utils/crypto');
const { getMessages, saveMessage } = require('./models/message');
const groupModel = require('./models/group');
const uploadRouter = require('./routes/upload');
const authRouter = require('./routes/auth');
const keysRouter = require('./routes/keys');
const pushRouter = require('./routes/push');
const { verifyToken } = require('./middleware/auth');
const userModel = require('./models/user');
const keystore = require('./models/keystore');
const privateMsg = require('./models/privateMessage');
const push = require('./utils/push');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = [CLIENT_URL, 'http://localhost:8081', 'http://localhost:19006'];

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? true : ALLOWED_ORIGINS,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/test', express.static(path.join(__dirname, '../public')));
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/keys', keysRouter);
app.use('/api/push', pushRouter);

const io = new Server(server, {
  cors: corsOptions,
});

const users = new Map();
const socketToUser = new Map();
const userSockets = new Map();
const activeCalls = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid token'));
  }
  socket.user = decoded;
  next();
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  const username = socket.user.username;
  const isNewUser = !userSockets.has(username);

  if (!userSockets.has(username)) {
    userSockets.set(username, new Set());
  }
  userSockets.get(username).add(socket.id);

  socketToUser.set(socket.id, username);

  if (isNewUser) {
    const fullUser = userModel.getUser(username);
    users.set(username, {
      id: username,
      userId: socket.user.id,
      username: username,
      displayName: fullUser?.displayName || username,
      joinedAt: new Date(),
    });
    userModel.setOnline(username);
    io.emit('user:list', Array.from(users.values()));
    io.emit('message:new', {
      id: uuidv4(),
      system: true,
      text: `${username} присоединился к чату`,
      timestamp: new Date(),
    });
  }

  socket.on('user:list', () => {
    socket.emit('user:list', Array.from(users.values()));
  });

  // Private messages
  socket.on('private:send', (data) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || !data.to) return;
    const message = privateMsg.savePrivateMessage(sender, data.to, {
      encrypted: data.encrypted,
      ciphertext: data.ciphertext,
      iv: data.iv,
      text: data.text,
    });
    const targetSockets = userSockets.get(data.to);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit('private:message', message);
      });
    }
    socket.emit('private:message', message);
    console.log(`[MSG] ${sender} -> ${data.to}, push: ${push.hasSubscription(data.to)}`);
    if (push.hasSubscription(data.to) && sender !== data.to) {
      push.sendPushNotification(data.to, {
        title: sender,
        body: data.encrypted ? 'Зашифрованное сообщение' : (data.text || 'Новое сообщение'),
        url: '/',
      }).catch(() => {});
    }
  });

  socket.on('private:history', (data) => {
    const username = socketToUser.get(socket.id);
    if (!username || !data.with) return;
    const messages = privateMsg.getPrivateMessages(username, data.with);
    socket.emit('private:history', messages);
    const readIds = privateMsg.markAsRead(data.with, username, username);
    if (readIds.length > 0) {
      const targetSockets = userSockets.get(data.with);
      if (targetSockets) {
        targetSockets.forEach((sid) => {
          io.to(sid).emit('private:read', { by: username, messageIds: readIds });
        });
      }
    }
  });

  socket.on('private:chats', () => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const chats = privateMsg.getChatsForUser(username);
    const enriched = chats.map((chat) => {
      const otherUserData = userModel.getUser(chat.otherUser);
      return {
        ...chat,
        otherUserDisplayName: otherUserData?.displayName || chat.otherUser,
        otherUserOnline: otherUserData?.online || false,
        otherUserLastSeen: otherUserData?.lastSeen || null,
      };
    });
    socket.emit('private:chats', enriched);
  });

  socket.on('user:status', (targetUsername, callback) => {
    const userData = userModel.getUser(targetUsername);
    if (userData && typeof callback === 'function') {
      callback({ online: userData.online, lastSeen: userData.lastSeen });
    }
  });

  socket.on('message:send', async (data) => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    let message;
    if (data.encrypted) {
      message = {
        id: uuidv4(),
        userId: socket.id,
        username: user.username,
        encrypted: true,
        ciphertext: data.ciphertext,
        iv: data.iv,
        ephemeralPublicKey: data.ephemeralPublicKey,
        salt: data.salt,
        timestamp: new Date(),
      };
    } else {
      message = await saveMessage(socket.id, user.username, data.text);
    }
    io.emit('message:new', message);
    const subscribedUsernames = push.getAllSubscribedUsernames();
    console.log(`[MSG] global from ${user.username}, push subs: [${subscribedUsernames.join(', ')}]`);
    for (const subUsername of subscribedUsernames) {
      if (subUsername !== user.username) {
        push.sendPushNotification(subUsername, {
          title: user.username,
          body: data.encrypted ? 'Зашифрованное сообщение' : (data.text || 'Новое сообщение'),
          icon: '/favicon.ico',
          url: '/',
        }).catch(() => {});
      }
    }
  });

  socket.on('message:history', async () => {
    try {
      const history = await getMessages(50);
      socket.emit('message:history', history);
    } catch (err) {
      console.error('Failed to load history:', err);
      socket.emit('message:history', []);
    }
  });

  socket.on('user:typing', () => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    socket.broadcast.emit('user:typing', user.username);
  });

  socket.on('user:stopTyping', () => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    socket.broadcast.emit('user:stopTyping', user.username);
  });

  socket.on('private:typing', (data) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || !data.to) return;
    const targetSockets = userSockets.get(data.to);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit('private:typing', { from: sender });
      });
    }
  });

  socket.on('private:stopTyping', (data) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || !data.to) return;
    const targetSockets = userSockets.get(data.to);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit('private:stopTyping', { from: sender });
      });
    }
  });

  socket.on('group:create', (name) => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    const group = groupModel.createGroup(name, socket.id);
    socket.join(`group:${group.id}`);
    socket.emit('group:created', {
      id: group.id,
      name: group.name,
      memberCount: 1,
    });
    io.emit('group:list', groupModel.getAllGroups());
  });

  socket.on('group:join', (groupId) => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    const group = groupModel.joinGroup(groupId, socket.id);
    if (!group) return;
    socket.join(`group:${groupId}`);
    socket.emit('group:joined', {
      id: group.id,
      name: group.name,
      memberCount: group.members.length,
    });
    io.to(`group:${groupId}`).emit('group:message:new', {
      id: uuidv4(),
      system: true,
      text: `${user.username} присоединился к группе`,
      timestamp: new Date(),
    });
    io.emit('group:list', groupModel.getAllGroups());
  });

  socket.on('group:leave', (groupId) => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    groupModel.leaveGroup(groupId, socket.id);
    socket.leave(`group:${groupId}`);
    io.to(`group:${groupId}`).emit('group:message:new', {
      id: uuidv4(),
      system: true,
      text: `${user.username} покинул группу`,
      timestamp: new Date(),
    });
    io.emit('group:list', groupModel.getAllGroups());
  });

  socket.on('group:message:send', (data) => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    if (!groupModel.isMember(data.groupId, socket.id)) return;
    const message = groupModel.sendGroupMessage(
      data.groupId,
      socket.id,
      user.username,
      data.text
    );
    if (message) {
      io.to(`group:${data.groupId}`).emit('group:message:new', message);
    }
  });

  socket.on('group:messages', (groupId) => {
    const messages = groupModel.getGroupMessages(groupId);
    socket.emit('group:messages', messages);
  });

  socket.on('group:list', () => {
    socket.emit('group:list', groupModel.getAllGroups());
  });

  // E2E Key exchange
  socket.on('e2e:publish-key', (data) => {
    keystore.storePublicKey(socket.user.id, socket.user.username, data.publicKey);
  });

  socket.on('e2e:get-key', (data, callback) => {
    const key = keystore.getPublicKeyByUsername(data.username);
    if (key && typeof callback === 'function') {
      callback(key);
    }
  });

  // P2P WebRTC signaling
  socket.on('call:initiate', (data) => {
    const callerUsername = socketToUser.get(socket.id);
    if (!callerUsername) return;
    const targetSockets = userSockets.get(data.targetUsername);
    if (!targetSockets || targetSockets.size === 0) {
      socket.emit('call:error', { message: 'Пользователь не в сети' });
      return;
    }

    activeCalls.delete(callerUsername);
    activeCalls.delete(data.targetUsername);

    activeCalls.set(callerUsername, { peer: data.targetUsername, at: Date.now() });
    const targetSocketId = targetSockets.values().next().value;
    io.to(targetSocketId).emit('call:incoming', {
      callerUsername: callerUsername,
      callerSocketId: socket.id,
      offer: data.offer,
    });
  });

  socket.on('call:accept', (data) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const callerUsername = socketToUser.get(data.callerSocketId);
    if (callerUsername) {
      const existing = activeCalls.get(callerUsername);
      activeCalls.set(callerUsername, { peer: username, at: existing ? existing.at : Date.now() });
    }
    if (!activeCalls.has(username)) {
      activeCalls.set(username, { peer: callerUsername, at: Date.now() });
    }
    io.to(data.callerSocketId).emit('call:accepted', {
      answer: data.answer,
      responderUsername: username,
      responderSocketId: socket.id,
    });
  });

  socket.on('call:reject', (data) => {
    const username = socketToUser.get(socket.id);
    const callerUsername = socketToUser.get(data.callerSocketId);
    if (username) activeCalls.delete(username);
    if (callerUsername) activeCalls.delete(callerUsername);
    io.to(data.callerSocketId).emit('call:rejected', { username });
  });

  socket.on('call:end', (data) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const call = activeCalls.get(username);
    if (!call) return;
    activeCalls.delete(username);
    if (call.peer) activeCalls.delete(call.peer);
    const peerSockets = userSockets.get(call.peer);
    if (peerSockets) {
      peerSockets.forEach((sid) => {
        if (sid !== socket.id) io.to(sid).emit('call:ended', { username });
      });
    }
  });

  socket.on('call:ice-candidate', (data) => {
    io.to(data.targetSocketId).emit('call:ice-candidate', {
      candidate: data.candidate,
      fromSocketId: socket.id,
    });
  });

  socket.on('disconnect', () => {
    const username = socketToUser.get(socket.id);
    if (username) {
      socketToUser.delete(socket.id);
      const sockets = userSockets.get(username);
      if (sockets) {
        sockets.delete(socket.id);
        if (activeCalls.has(username)) {
          const call = activeCalls.get(username);
          activeCalls.delete(username);
          activeCalls.delete(call.peer);
          const peerSockets = userSockets.get(call.peer);
          if (peerSockets) {
            peerSockets.forEach((sid) => {
              io.to(sid).emit('call:ended', { username });
            });
          }
        }
        if (sockets.size === 0) {
          userSockets.delete(username);
          users.delete(username);
          userModel.setOffline(username);
          io.emit('user:stopTyping', username);
          io.emit('user:list', Array.from(users.values()));
          io.emit('user:offline', { username, lastSeen: new Date().toISOString() });
          io.emit('message:new', {
            id: uuidv4(),
            system: true,
            text: `${username} покинул чат`,
            timestamp: new Date(),
          });
        }
      }
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', users: users.size, timestamp: new Date().toISOString(), version: 'v3-no-resend' });
});

if (process.env.NODE_ENV === 'production') {
  const next = require('next');
  const nextApp = next({ dev: false, dir: path.join(__dirname, '../../client') });
  const handle = nextApp.getRequestHandler();
  nextApp.prepare().then(() => {
    app.all('*', (req, res) => handle(req, res));
  }).catch(err => {
    console.error('Next.js prepare failed:', err);
    app.get('*', (req, res) => res.status(500).send('Client build error'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
