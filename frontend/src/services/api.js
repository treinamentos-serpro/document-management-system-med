const API_PREFIX = '/api';

async function parseError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || 'Não foi possível concluir a operação.';
  } catch {
    return 'Não foi possível concluir a operação.';
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, options);

  if (!response.ok) {
    const error = new Error(await parseError(response));
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function listDocuments(options = {}) {
  const response = await request('/documents', options);
  return response.json();
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = owner ? { 'X-Owner-Id': owner } : undefined;
  const response = await request('/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  return response.json();
}

function getFilename(response, fallback) {
  const disposition = response.headers.get('content-disposition');
  const encodedFilename = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (encodedFilename) {
    return decodeURIComponent(encodedFilename);
  }

  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export async function downloadDocument(document) {
  const response = await request(`/documents/${encodeURIComponent(document.id)}/download`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  link.href = url;
  link.download = getFilename(response, document.originalName);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}