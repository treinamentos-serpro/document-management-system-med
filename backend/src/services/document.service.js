const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

class DocumentService {
  constructor({ repository, defaultOwner = 'anonymous' } = {}) {
    this.repository = repository;
    this.defaultOwner = defaultOwner;
  }

  async createDocument({ file, owner }) {
    if (!file) {
      const error = new Error('Arquivo é obrigatório');
      error.code = 'FILE_REQUIRED';
      error.statusCode = 400;
      throw error;
    }

    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: owner || this.defaultOwner,
      storedFilename: file.filename,
      mimetype: file.mimetype,
    };

    try {
      return this.repository.create(document);
    } catch (error) {
      await this.repository.removeFile(file.path);
      error.code = error.code || 'STORAGE_ERROR';
      error.statusCode = error.statusCode || 500;
      throw error;
    }
  }

  listDocuments() {
    return this.repository.list();
  }

  async getDownload(documentId) {
    const document = this.repository.findById(documentId);

    if (!document) {
      const error = new Error('Documento não encontrado');
      error.code = 'DOCUMENT_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    let filePath;
    try {
      filePath = this.repository.getFilePath(document);
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      if (error.code === 'INVALID_STORED_FILENAME') {
        error.statusCode = 500;
        throw error;
      }

      const fileError = new Error('Arquivo do documento não encontrado');
      fileError.code = 'FILE_NOT_FOUND';
      fileError.statusCode = 404;
      throw fileError;
    }

    return {
      filePath,
      originalName: document.originalName,
      mimetype: document.mimetype,
    };
  }
}

module.exports = DocumentService;