const fs = require('node:fs');
const path = require('node:path');

class DocumentRepository {
  constructor({ storageDirectory } = {}) {
    this.storageDirectory = storageDirectory || path.resolve(__dirname, '../../storage');
    this.documents = new Map();
  }

  create(document) {
    const record = { ...document };
    this.documents.set(record.id, record);
    return this.toPublicDocument(record);
  }

  list() {
    return Array.from(this.documents.values(), (document) => this.toPublicDocument(document));
  }

  findById(id) {
    return this.documents.get(id) || null;
  }

  getFilePath(document) {
    const storedFilename = path.basename(document.storedFilename);

    if (storedFilename !== document.storedFilename) {
      const error = new Error('Referência de arquivo inválida');
      error.code = 'INVALID_STORED_FILENAME';
      throw error;
    }

    return path.join(this.storageDirectory, storedFilename);
  }

  async removeFile(filePath) {
    await fs.promises.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  toPublicDocument(document) {
    const { storedFilename, filePath, mimetype, ...publicDocument } = document;
    return publicDocument;
  }
}

module.exports = DocumentRepository;