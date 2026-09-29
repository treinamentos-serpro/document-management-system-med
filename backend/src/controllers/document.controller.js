class DocumentController {
  constructor({ service }) {
    this.service = service;
  }

  async upload(req, res, next) {
    try {
      const document = await this.service.createDocument({
        file: req.file,
        owner: req.get('X-Owner-Id') || process.env.DEFAULT_OWNER || 'anonymous',
      });

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  }

  list(req, res, next) {
    try {
      res.json(this.service.listDocuments());
    } catch (error) {
      error.code = error.code || 'DOCUMENT_LIST_ERROR';
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  }

  async download(req, res, next) {
    try {
      const document = await this.service.getDownload(req.params.id);

      res.download(document.filePath, document.originalName, {
        headers: { 'Content-Type': document.mimetype || 'application/octet-stream' },
      }, (error) => {
        if (error && !res.headersSent) {
          error.code = 'DOWNLOAD_ERROR';
          error.statusCode = 500;
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DocumentController;