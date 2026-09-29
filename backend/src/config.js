const path = require('node:path');

const DEFAULT_MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const DEFAULT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

function parseMaxUploadSize(value) {
  if (value === undefined || value === '') {
    return DEFAULT_MAX_UPLOAD_SIZE;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('MAX_UPLOAD_SIZE deve ser um inteiro positivo');
  }

  return parsed;
}

function parsePort(value) {
  const parsed = Number(value || 3000);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535');
  }

  return parsed;
}

function parseExtensions(value) {
  const extensions = (value || DEFAULT_EXTENSIONS.join(','))
    .split(',')
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean)
    .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`));

  if (extensions.length === 0 || extensions.some((extension) => !/^\.[a-z0-9]+$/.test(extension))) {
    throw new Error('ALLOWED_EXTENSIONS contém uma extensão inválida');
  }

  return new Set(extensions);
}

function createConfig(env = process.env) {
  const defaultOwner = (env.DEFAULT_OWNER || 'anonymous').trim();
  if (!defaultOwner || defaultOwner.length > 100 || /[\r\n]/.test(defaultOwner)) {
    throw new Error('DEFAULT_OWNER deve ter entre 1 e 100 caracteres');
  }

  return {
    port: parsePort(env.PORT),
    storageDirectory: path.resolve(env.STORAGE_DIRECTORY || path.resolve(__dirname, '../storage')),
    maxUploadSize: parseMaxUploadSize(env.MAX_UPLOAD_SIZE),
    allowedExtensions: parseExtensions(env.ALLOWED_EXTENSIONS),
    defaultOwner,
  };
}

module.exports = { createConfig };