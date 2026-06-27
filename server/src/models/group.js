const { v4: uuidv4 } = require('uuid');

const groups = new Map();

function createGroup(name, creatorId) {
  const id = uuidv4();
  const group = {
    id,
    name,
    creatorId,
    members: [creatorId],
    messages: [],
    createdAt: new Date(),
  };
  groups.set(id, group);
  return group;
}

function joinGroup(groupId, userId) {
  const group = groups.get(groupId);
  if (!group) return null;
  if (!group.members.includes(userId)) {
    group.members.push(userId);
  }
  return group;
}

function leaveGroup(groupId, userId) {
  const group = groups.get(groupId);
  if (!group) return null;
  group.members = group.members.filter((id) => id !== userId);
  return group;
}

function getGroup(groupId) {
  return groups.get(groupId) || null;
}

function getAllGroups() {
  return Array.from(groups.values()).map((g) => ({
    id: g.id,
    name: g.name,
    creatorId: g.creatorId,
    memberCount: g.members.length,
    createdAt: g.createdAt,
  }));
}

function getGroupMessages(groupId) {
  const group = groups.get(groupId);
  if (!group) return [];
  return group.messages.slice(-100);
}

function sendGroupMessage(groupId, userId, username, text) {
  const group = groups.get(groupId);
  if (!group) return null;
  const message = {
    id: uuidv4(),
    groupId,
    userId,
    username,
    text,
    timestamp: new Date(),
  };
  group.messages.push(message);
  return message;
}

function isMember(groupId, userId) {
  const group = groups.get(groupId);
  if (!group) return false;
  return group.members.includes(userId);
}

module.exports = {
  createGroup,
  joinGroup,
  leaveGroup,
  getGroup,
  getAllGroups,
  getGroupMessages,
  sendGroupMessage,
  isMember,
};
