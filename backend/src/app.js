// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const createDocumentRoutes = require('./routes/document.routes');
const { createConfig } = require('./config');

function createApp({ config = createConfig() } = {}) {
  const app = express();

  app.use(express.json());
  app.use(createDocumentRoutes({ config }));

  // Endpoint de verificação de saúde.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const statusCode = error.code === 'LIMIT_FILE_SIZE'
      ? 413
      : error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 400
        : error.statusCode || 500;
    const code = error.code === 'LIMIT_FILE_SIZE'
      ? 'FILE_TOO_LARGE'
      : error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'UNEXPECTED_FILE_FIELD'
        : error.code || 'INTERNAL_SERVER_ERROR';
    const message = statusCode >= 500 ? 'Erro interno do servidor' : error.message;

    return res.status(statusCode).json({ error: { code, message } });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(createConfig().port, () => {
    console.log(`DMS backend ouvindo na porta ${createConfig().port}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
