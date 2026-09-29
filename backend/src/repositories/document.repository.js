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

  async validateFile(file) {
    const extension = path.extname(file.originalname).toLowerCase();
    const signatures = {
      '.pdf': Buffer.from('%PDF-'),
      '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      '.jpg': Buffer.from([0xff, 0xd8, 0xff]),
      '.jpeg': Buffer.from([0xff, 0xd8, 0xff]),
      '.doc': Buffer.from([0xd0, 0xcf, 0x11, 0xe0]),
      '.docx': Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    };
    const signature = signatures[extension];

    if (!signature) {
      return;
    }

    const handle = await fs.promises.open(file.path, 'r');
    try {
      const buffer = Buffer.alloc(signature.length);
      const { bytesRead } = await handle.read(buffer, 0, signature.length, 0);
      if (bytesRead !== signature.length || !buffer.equals(signature)) {
        const error = new Error('Conteúdo incompatível com a extensão do arquivo');
        error.code = 'FILE_CONTENT_NOT_ALLOWED';
        error.statusCode = 400;
        throw error;
      }
    } finally {
      await handle.close();
    }
  }

  async openFile(document) {
    const storedFilename = path.basename(document.storedFilename);

    if (storedFilename !== document.storedFilename) {
      const error = new Error('Referência de arquivo inválida');
      error.code = 'INVALID_STORED_FILENAME';
      throw error;
    }

    const storageDirectory = await fs.promises.realpath(this.storageDirectory);
    const filePath = path.resolve(storageDirectory, storedFilename);
    const relativePath = path.relative(storageDirectory, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      const error = new Error('Referência de arquivo inválida');
      error.code = 'INVALID_STORED_FILENAME';
      throw error;
    }

    let fileHandle;
    try {
      const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
      fileHandle = await fs.promises.open(filePath, flags);
      const stats = await fileHandle.stat();
      if (!stats.isFile()) {
        const error = new Error('Arquivo do documento não encontrado');
        error.code = 'FILE_NOT_FOUND';
        throw error;
      }

      return { fileHandle, filePath, size: stats.size };
    } catch (error) {
      await fileHandle?.close().catch(() => {});
      throw error;
    }
  }

  async removeFile(filePath) {
    const storageDirectory = path.resolve(this.storageDirectory);
    const candidatePath = path.resolve(filePath);
    const relativePath = path.relative(storageDirectory, candidatePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      const error = new Error('Caminho de limpeza inválido');
      error.code = 'INVALID_STORAGE_PATH';
      throw error;
    }

    await fs.promises.unlink(candidatePath).catch((error) => {
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