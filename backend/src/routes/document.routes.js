const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

const DocumentController = require('../controllers/document.controller');
const DocumentRepository = require('../repositories/document.repository');
const DocumentService = require('../services/document.service');

const router = express.Router();
const storageDirectory = path.resolve(__dirname, '../../storage');
const allowedExtensions = new Set(
  (process.env.ALLOWED_EXTENSIONS || '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg')
    .split(',')
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean)
    .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`)),
);

fs.mkdirSync(storageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, storageDirectory),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024) },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      const error = new Error('Tipo de arquivo não permitido');
      error.code = 'FILE_TYPE_NOT_ALLOWED';
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

const repository = new DocumentRepository({ storageDirectory });
const service = new DocumentService({
  repository,
  defaultOwner: process.env.DEFAULT_OWNER || 'anonymous',
});
const controller = new DocumentController({ service });

router.post('/upload', upload.single('file'), controller.upload.bind(controller));
router.get('/documents', controller.list.bind(controller));
router.get('/documents/:id/download', controller.download.bind(controller));

module.exports = router;