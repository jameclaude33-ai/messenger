const { v4: uuidv4 } = require('uuid');

const files = new Map();

function saveFile(fileData) {
  const id = uuidv4();
  const record = {
    id,
    originalName: fileData.originalname,
    filename: fileData.filename,
    mimetype: fileData.mimetype,
    size: fileData.size,
    path: fileData.path,
    uploadedBy: fileData.uploadedBy,
    uploadedAt: new Date(),
  };
  files.set(id, record);
  return record;
}

function getFile(fileId) {
  return files.get(fileId) || null;
}

function getFilesByUser(userId) {
  return Array.from(files.values()).filter((f) => f.uploadedBy === userId);
}

module.exports = { saveFile, getFile, getFilesByUser };
