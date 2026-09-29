const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('realiza upload, listagem, download e trata erros da API', async () => {
  const server = http.createServer(app).listen(0);
  await once(server, 'listening');

  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    const form = new FormData();
    form.append('file', new File(['conteudo de teste'], 'teste.txt', { type: 'text/plain' }));

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-Owner-Id': 'user-test' },
      body: form,
    });

    assert.strictEqual(uploadResponse.status, 201);
    const document = await uploadResponse.json();
    assert.strictEqual(document.originalName, 'teste.txt');
    assert.strictEqual(document.owner, 'user-test');
    assert.strictEqual(Object.hasOwn(document, 'storedFilename'), false);

    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(listResponse.status, 200);
    assert.ok((await listResponse.json()).some((item) => item.id === document.id));

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
    assert.match(downloadResponse.headers.get('content-disposition'), /teste\.txt/);

    const missingResponse = await fetch(`${baseUrl}/documents/missing/download`);
    assert.strictEqual(missingResponse.status, 404);
    assert.strictEqual((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

    const invalidForm = new FormData();
    invalidForm.append('file', new File(['conteudo'], 'script.exe', {
      type: 'application/octet-stream',
    }));
    const invalidResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: invalidForm,
    });
    assert.strictEqual(invalidResponse.status, 400);
    assert.strictEqual((await invalidResponse.json()).error.code, 'FILE_TYPE_NOT_ALLOWED');

    const storageDirectory = path.resolve(__dirname, '../storage');
    await fs.unlink(path.join(storageDirectory, 'teste.txt')).catch(() => {});
    const storageEntries = await fs.readdir(storageDirectory);
    const generatedFile = storageEntries.find((entry) => entry.endsWith('.txt'));
    if (generatedFile) {
      await fs.unlink(path.join(storageDirectory, generatedFile));
    }
  } finally {
    server.close();
    await once(server, 'close');
  }
});
