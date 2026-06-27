const express = require('express');
const multer = require('multer');
const path = require('path');
const { saveFile } = require('../models/file');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const record = saveFile({
    ...req.file,
    uploadedBy: req.body.userId || 'anonymous',
  });

  res.json({
    id: record.id,
    filename: record.filename,
    originalName: record.originalName,
    mimetype: record.mimetype,
    size: record.size,
    url: '/uploads/' + record.filename,
  });
});

module.exports = router;
