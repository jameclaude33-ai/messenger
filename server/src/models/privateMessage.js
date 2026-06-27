const { v4: uuidv4 } = require('uuid');

const privateMessages = new Map();

function getChatId(user1, user2) {
  return [user1, user2].sort().join(':');
}

function savePrivateMessage(from, to, data) {
  const chatId = getChatId(from, to);
  if (!privateMessages.has(chatId)) {
    privateMessages.set(chatId, []);
  }
  const message = {
    id: uuidv4(),
    from,
    to,
    chatId,
    encrypted: data.encrypted || false,
    ciphertext: data.ciphertext || null,
    iv: data.iv || null,
    text: data.text || null,
    timestamp: new Date(),
  };
  privateMessages.get(chatId).push(message);
  return message;
}

function getPrivateMessages(user1, user2, limit = 50) {
  const chatId = getChatId(user1, user2);
  const messages = privateMessages.get(chatId) || [];
  return messages.slice(-limit);
}

function getChatsForUser(username) {
  const chats = [];
  for (const [chatId, messages] of privateMessages) {
    const [u1, u2] = chatId.split(':');
    if (u1 === username || u2 === username) {
      const other = u1 === username ? u2 : u1;
      const lastMessage = messages[messages.length - 1];
      chats.push({
        chatId,
        otherUser: other,
        lastMessage: lastMessage ? {
          text: lastMessage.text,
          encrypted: lastMessage.encrypted,
          from: lastMessage.from,
          timestamp: lastMessage.timestamp,
        } : null,
        unread: messages.filter(m => m.to === username && !m.read).length,
      });
    }
  }
  chats.sort((a, b) => {
    const tA = a.lastMessage?.timestamp || 0;
    const tB = b.lastMessage?.timestamp || 0;
    return new Date(tB) - new Date(tA);
  });
  return chats;
}

function markAsRead(user1, user2, username) {
  const chatId = getChatId(user1, user2);
  const messages = privateMessages.get(chatId) || [];
  messages.forEach(m => {
    if (m.to === username) m.read = true;
  });
}

module.exports = { savePrivateMessage, getPrivateMessages, getChatsForUser, markAsRead, getChatId };
