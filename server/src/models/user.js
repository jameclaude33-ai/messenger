const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const users = new Map();
const emailToUsername = new Map();
const SALT_ROUNDS = 10;

async function register(username, password, email) {
  if (users.has(username)) {
    throw new Error('Username already exists');
  }
  if (email && emailToUsername.has(email.toLowerCase())) {
    throw new Error('Email already registered');
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: uuidv4(),
    username,
    email: email ? email.toLowerCase() : null,
    password: hashedPassword,
    createdAt: new Date(),
    online: false,
    lastSeen: new Date(),
  };
  users.set(username, user);
  if (email) emailToUsername.set(email.toLowerCase(), username);
  return { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt };
}

async function login(usernameOrEmail, password) {
  let user;
  if (usernameOrEmail.includes('@')) {
    const username = emailToUsername.get(usernameOrEmail.toLowerCase());
    if (username) user = users.get(username);
  } else {
    user = users.get(usernameOrEmail);
  }
  if (!user) {
    throw new Error('Invalid credentials');
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  user.online = true;
  user.lastSeen = new Date();
  return { id: user.id, username: user.username, email: user.email };
}

function findByEmail(email) {
  const username = emailToUsername.get(email.toLowerCase());
  return username ? users.get(username) : null;
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
  return { id: user.id, username: user.username, email: user.email, online: user.online, lastSeen: user.lastSeen };
}

function getAllUsers() {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    username: u.username,
    online: u.online,
    lastSeen: u.lastSeen,
  }));
}

module.exports = { register, login, findByEmail, setOnline, setOffline, getUser, getAllUsers };
