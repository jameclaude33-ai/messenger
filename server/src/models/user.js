const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/users.json');
const SALT_ROUNDS = 10;

let users = new Map();
let emailToUsername = new Map();

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      users = new Map(data.users || []);
      emailToUsername = new Map(data.emails || []);
      console.log(`Loaded ${users.size} users from disk`);
    }
  } catch (err) {
    console.error('Failed to load users from disk:', err.message);
  }
}

function saveToDisk() {
  try {
    ensureDataDir();
    const data = {
      users: Array.from(users.entries()),
      emails: Array.from(emailToUsername.entries()),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save users to disk:', err.message);
  }
}

loadFromDisk();

async function register(username, password, email, displayName) {
  if (users.has(username)) {
    throw new Error('Username already exists');
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: uuidv4(),
    username,
    displayName: displayName || username,
    email: email ? email.toLowerCase() : null,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    online: false,
    lastSeen: new Date().toISOString(),
  };
  users.set(username, user);
  if (email) emailToUsername.set(email.toLowerCase(), username);
  saveToDisk();
  return { id: user.id, username: user.username, displayName: user.displayName, email: user.email, createdAt: user.createdAt };
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
  user.lastSeen = new Date().toISOString();
  saveToDisk();
  return { id: user.id, username: user.username, displayName: user.displayName || user.username, email: user.email };
}

function findByEmail(email) {
  const username = emailToUsername.get(email.toLowerCase());
  return username ? users.get(username) : null;
}

function setOnline(username) {
  const user = users.get(username);
  if (user) {
    user.online = true;
    user.lastSeen = new Date().toISOString();
    saveToDisk();
  }
}

function setOffline(username) {
  const user = users.get(username);
  if (user) {
    user.online = false;
    user.lastSeen = new Date().toISOString();
    saveToDisk();
  }
}

function getUser(username) {
  const user = users.get(username);
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.displayName || user.username, email: user.email, online: user.online, lastSeen: user.lastSeen };
}

function getAllUsers() {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,
    online: u.online,
    lastSeen: u.lastSeen,
  }));
}

function getUserByTag(tag) {
  const user = users.get(tag);
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.displayName || user.username, online: user.online };
}

module.exports = { register, login, findByEmail, setOnline, setOffline, getUser, getAllUsers, getUserByTag };
