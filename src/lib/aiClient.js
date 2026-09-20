/**
 * Frontend client for Vercel/Vite /api Mistral routes.
 * Never sends MISTRAL_API_KEY from the browser — server holds the key.
 */

async function postJson(path, body, { signal } = {}) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `api_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function analyzeWithMistral({ imageDataUrl, text, documentTitle, signal } = {}) {
  return postJson('/api/analyze', { imageDataUrl, text, documentTitle }, { signal });
}

export async function sherlockWithMistral({ question, context, history, signal } = {}) {
  return postJson('/api/sherlock', { question, context, history }, { signal });
}

/** Read File / Blob as data URL for Pixtral. */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read_failed'));
    reader.readAsDataURL(blob);
  });
}

export async function resolveImageDataUrl(imageSource) {
  if (!imageSource) return '';
  if (typeof imageSource === 'string') {
    if (imageSource.startsWith('data:')) return imageSource;
    if (imageSource.startsWith('blob:') || imageSource.startsWith('http')) {
      const res = await fetch(imageSource);
      if (!res.ok) throw new Error(`fetch_image_${res.status}`);
      const blob = await res.blob();
      return blobToDataUrl(blob);
    }
    return '';
  }
  if (typeof Blob !== 'undefined' && imageSource instanceof Blob) {
    return blobToDataUrl(imageSource);
  }
  return '';
}
