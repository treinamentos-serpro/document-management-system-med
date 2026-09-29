import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/api.js';

test('lista documentos usando o prefixo /api', async () => {
  const originalFetch = globalThis.fetch;
  let request;

  globalThis.fetch = async (...args) => {
    request = args;
    return new Response(JSON.stringify([{ id: 'doc-1', originalName: 'manual.pdf' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const documents = await listDocuments();

    assert.deepEqual(documents, [{ id: 'doc-1', originalName: 'manual.pdf' }]);
    assert.strictEqual(request[0], '/api/documents');
    assert.deepEqual(request[1], {});
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('envia um arquivo como multipart e informa o proprietário', async () => {
  const originalFetch = globalThis.fetch;
  let request;

  globalThis.fetch = async (...args) => {
    request = args;
    return new Response(JSON.stringify({ id: 'doc-2', originalName: 'relatorio.txt' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const file = new File(['conteudo'], 'relatorio.txt', { type: 'text/plain' });
    const document = await uploadDocument(file, 'equipe-financeiro');
    const bodyFile = request[1].body.get('file');

    assert.deepEqual(document, { id: 'doc-2', originalName: 'relatorio.txt' });
    assert.strictEqual(request[0], '/api/upload');
    assert.strictEqual(request[1].method, 'POST');
    assert.strictEqual(request[1].headers['X-Owner-Id'], 'equipe-financeiro');
    assert.strictEqual(bodyFile.name, 'relatorio.txt');
    assert.strictEqual(await bodyFile.text(), 'conteudo');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('propaga erros padronizados da API', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado' },
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await assert.rejects(
      () => listDocuments(),
      (error) => error.message === 'Documento não encontrado' && error.status === 404,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('baixa o arquivo usando filename* e revoga o Blob URL', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = globalThis.URL;
  const originalWindow = globalThis.window;
  let clicked = false;
  let revokedUrl;
  const link = {
    click: () => { clicked = true; },
  };

  globalThis.fetch = async () => new Response('conteudo', {
    status: 200,
    headers: { 'Content-Disposition': "attachment; filename*=UTF-8''relat%C3%B3rio.pdf" },
  });
  globalThis.URL = {
    createObjectURL: () => 'blob:test',
    revokeObjectURL: (url) => { revokedUrl = url; },
  };
  globalThis.window = { document: { createElement: () => link } };

  try {
    await downloadDocument({ id: 'doc 3', originalName: 'fallback.txt' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.strictEqual(clicked, true);
    assert.strictEqual(link.download, 'relatório.pdf');
    assert.strictEqual(revokedUrl, 'blob:test');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.URL = originalUrl;
    globalThis.window = originalWindow;
  }
});