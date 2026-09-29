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
  const { signal, timeout = 15000, ...fetchOptions } = options;
  let timeoutController;
  let removeAbortListener;
  let requestOptions = fetchOptions;
  let timeoutId;

  if (signal) {
    timeoutController = new AbortController();
    const abortRequest = () => timeoutController.abort();
    signal.addEventListener('abort', abortRequest, { once: true });
    removeAbortListener = () => signal.removeEventListener('abort', abortRequest);
    requestOptions = { ...fetchOptions, signal: timeoutController.signal };
  }

  try {
    const responsePromise = fetch(`${API_PREFIX}${path}`, requestOptions);
    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        timeoutController?.abort();
        const error = new Error('A requisição excedeu o tempo limite.');
        error.name = 'TimeoutError';
        reject(error);
      }, timeout);
    });
    const response = await Promise.race([responsePromise, timeoutPromise]);

    if (!response.ok) {
      const error = new Error(await parseError(response));
      error.status = response.status;
      throw error;
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
    removeAbortListener?.();
    if (signal && timeoutController) {
      timeoutController.abort();
    }
  }
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