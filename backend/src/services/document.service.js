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

    try {
      const normalizedOwner = this.normalizeOwner(owner);
      await this.repository.validateFile(file);
      const document = {
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner: normalizedOwner,
        storedFilename: file.filename,
        mimetype: file.mimetype,
      };

      return this.repository.create(document);
    } catch (error) {
      await this.repository.removeFile(file.path);
      if (!['FILE_CONTENT_NOT_ALLOWED', 'OWNER_INVALID'].includes(error.code)) {
        error.code = 'STORAGE_ERROR';
        error.statusCode = 500;
      }
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

    try {
      const file = await this.repository.openFile(document);
      return {
        ...file,
        originalName: document.originalName,
        mimetype: document.mimetype,
      };
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
  }

  normalizeOwner(owner) {
    const candidate = (owner || this.defaultOwner).trim();
    if (!candidate || candidate.length > 100 || /[\r\n]/.test(candidate)) {
      const error = new Error('Identificador de usuário inválido');
      error.code = 'OWNER_INVALID';
      error.statusCode = 400;
      throw error;
    }

    return candidate;
  }
}

module.exports = DocumentService;