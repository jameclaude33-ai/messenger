const { v4: uuidv4 } = require('uuid');

let pool;
let useDb = false;

try {
  pool = require('../db');
  pool.query('SELECT 1').then(() => {
    useDb = true;
    console.log('PostgreSQL connected');
  }).catch(() => {
    console.log('PostgreSQL not available, using in-memory storage');
  });
} catch {
  console.log('PostgreSQL not available, using in-memory storage');
}

const inMemoryMessages = [];

async function getMessages(limit = 50) {
  if (useDb) {
    const { rows } = await pool.query(
      'SELECT id, user_id AS "userId", username, text, created_at AS "timestamp" FROM messages ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows.reverse();
  }
  return inMemoryMessages.slice(-limit);
}

async function saveMessage(userId, username, text) {
  if (useDb) {
    const { rows } = await pool.query(
      'INSERT INTO messages (user_id, username, text) VALUES ($1, $2, $3) RETURNING id, user_id AS "userId", username, text, created_at AS "timestamp"',
      [userId, username, text]
    );
    return rows[0];
  }
  const message = {
    id: uuidv4(),
    userId,
    username,
    text,
    timestamp: new Date(),
  };
  inMemoryMessages.push(message);
  return message;
}

module.exports = { getMessages, saveMessage };
