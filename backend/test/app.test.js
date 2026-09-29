const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const { once } = require('node:events');
const appModule = require('../src/app');
const { createConfig } = require('../src/config');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(appModule, 'o app deve estar definido');
  assert.strictEqual(typeof appModule, 'function', 'o app Express deve ser uma função');
});

async function createTestServer() {
  const storageDirectory = await fs.mkdtemp(`${os.tmpdir()}/dms-test-`);
  const app = appModule.createApp({
    config: createConfig({ STORAGE_DIRECTORY: storageDirectory }),
  });
  const server = http.createServer(app).listen(0);
  await once(server, 'listening');

  return {
    server,
    storageDirectory,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

async function closeTestServer({ server, storageDirectory }) {
  server.close();
  await once(server, 'close');
  await fs.rm(storageDirectory, { recursive: true, force: true });
}

async function uploadTestFile(baseUrl, name = 'teste.txt', contents = 'conteudo de teste') {
  const form = new FormData();
  form.append('file', new File([contents], name, { type: 'text/plain' }));

  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-Owner-Id': 'user-test' },
    body: form,
  });
}

test('realiza upload de documento', async () => {
  const testServer = await createTestServer();

  try {
    const uploadResponse = await uploadTestFile(testServer.baseUrl);

    assert.strictEqual(uploadResponse.status, 201);
    const document = await uploadResponse.json();
    assert.strictEqual(document.originalName, 'teste.txt');
    assert.strictEqual(document.owner, 'user-test');
    assert.strictEqual(Object.hasOwn(document, 'storedFilename'), false);
  } finally {
    await closeTestServer(testServer);
  }
});

test('lista documentos enviados', async () => {
  const testServer = await createTestServer();

  try {
    const firstUpload = await uploadTestFile(testServer.baseUrl, 'primeiro.txt');
    const secondUpload = await uploadTestFile(testServer.baseUrl, 'segundo.txt');
    const firstDocument = await firstUpload.json();
    const secondDocument = await secondUpload.json();

    const listResponse = await fetch(`${testServer.baseUrl}/documents`);
    assert.strictEqual(listResponse.status, 200);
    const documents = await listResponse.json();
    assert.deepStrictEqual(
      documents.map((document) => document.id),
      [firstDocument.id, secondDocument.id],
    );
  } finally {
    await closeTestServer(testServer);
  }
});

test('faz download do documento enviado', async () => {
  const testServer = await createTestServer();

  try {
    const uploadResponse = await uploadTestFile(testServer.baseUrl);
    const document = await uploadResponse.json();

    const downloadResponse = await fetch(`${testServer.baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
    assert.match(downloadResponse.headers.get('content-disposition'), /teste\.txt/);

    const missingResponse = await fetch(`${testServer.baseUrl}/documents/missing/download`);
    assert.strictEqual(missingResponse.status, 404);
    assert.strictEqual((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
  } finally {
    await closeTestServer(testServer);
  }
});
