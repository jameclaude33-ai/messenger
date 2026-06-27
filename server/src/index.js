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
const { verifyToken } = require('./middleware/auth');
const userModel = require('./models/user');
const keystore = require('./models/keystore');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = [CLIENT_URL, 'http://localhost:8081', 'http://localhost:19006'];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/test', express.static(path.join(__dirname, '../public')));
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/keys', keysRouter);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

const users = new Map();
const socketToUser = new Map();
const userSockets = new Map();

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
    users.set(username, {
      id: username,
      userId: socket.user.id,
      username: username,
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

  socket.on('message:send', async (data) => {
    const user = users.get(socketToUser.get(socket.id));
    if (!user) return;
    if (data.encrypted) {
      const message = {
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
      io.emit('message:new', message);
    } else {
      const message = await saveMessage(socket.id, user.username, data.text);
      io.emit('message:new', message);
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
    const targetSocketId = socketToUser.get(data.targetUsername);
    if (!targetSocketId) {
      socket.emit('call:error', { message: 'User not online' });
      return;
    }
    const caller = users.get(socketToUser.get(socket.id));
    io.to(targetSocketId).emit('call:incoming', {
      callerUsername: caller.username,
      callerSocketId: socket.id,
      offer: data.offer,
    });
  });

  socket.on('call:accept', (data) => {
    io.to(data.callerSocketId).emit('call:accepted', {
      answer: data.answer,
      responderUsername: socket.user.username,
    });
  });

  socket.on('call:reject', (data) => {
    io.to(data.callerSocketId).emit('call:rejected', {
      username: socket.user.username,
    });
  });

  socket.on('call:end', (data) => {
    io.to(data.targetSocketId).emit('call:ended', {
      username: socket.user.username,
    });
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
        if (sockets.size === 0) {
          userSockets.delete(username);
          users.delete(username);
          userModel.setOffline(username);
          io.emit('user:stopTyping', username);
          io.emit('user:list', Array.from(users.values()));
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
  res.json({ status: 'ok', users: users.size });
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
