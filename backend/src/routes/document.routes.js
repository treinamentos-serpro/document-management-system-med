const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

const DocumentController = require('../controllers/document.controller');
const DocumentRepository = require('../repositories/document.repository');
const DocumentService = require('../services/document.service');

function createDocumentRoutes({ config }) {
  const router = express.Router();
  fs.mkdirSync(config.storageDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, config.storageDirectory),
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: config.maxUploadSize },
    fileFilter: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();

      if (!config.allowedExtensions.has(extension)) {
        const error = new Error('Tipo de arquivo não permitido');
        error.code = 'FILE_TYPE_NOT_ALLOWED';
        error.statusCode = 400;
        return callback(error);
      }

      return callback(null, true);
    },
  });

  const repository = new DocumentRepository({ storageDirectory: config.storageDirectory });
  const service = new DocumentService({ repository, defaultOwner: config.defaultOwner });
  const controller = new DocumentController({ service });

  router.post('/upload', upload.single('file'), controller.upload.bind(controller));
  router.get('/documents', controller.list.bind(controller));
  router.get('/documents/:id/download', controller.download.bind(controller));

  return router;
}

module.exports = createDocumentRoutes;