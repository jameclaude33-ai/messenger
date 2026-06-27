const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const users = new Map();
const SALT_ROUNDS = 10;

async function register(username, password) {
  if (users.has(username)) {
    throw new Error('Username already exists');
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    createdAt: new Date(),
    online: false,
    lastSeen: new Date(),
  };
  users.set(username, user);
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

async function login(username, password) {
  const user = users.get(username);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  user.online = true;
  user.lastSeen = new Date();
  return { id: user.id, username: user.username };
}

function setOnline(username) {
  const user = users.get(username);
  if (user) {
    user.online = true;
    user.lastSeen = new Date();
  }
}

function setOffline(username) {
  const user = users.get(username);
  if (user) {
    user.online = false;
    user.lastSeen = new Date();
  }
}

function getUser(username) {
  const user = users.get(username);
  if (!user) return null;
  return { id: user.id, username: user.username, online: user.online, lastSeen: user.lastSeen };
}

function getAllUsers() {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    username: u.username,
    online: u.online,
    lastSeen: u.lastSeen,
  }));
}

module.exports = { register, login, setOnline, setOffline, getUser, getAllUsers };
