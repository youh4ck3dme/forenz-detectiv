const IMAGE_UPLOAD_EXT = /\.(png|jpe?g|webp|bmp|gif)$/i;

/** png/jpeg/webp uploads that should run client-side OCR. */
export function isImageUploadFile(file) {
  if (!file) return false;
  return file.type?.startsWith('image/') || IMAGE_UPLOAD_EXT.test(file.name || '');
}

// Príprava súboru pre upload: textové súbory pass-through, obrázky normalizácia.
// Multi-page PDF sa pred uploadom rozdelí v upload flow (pdfPageChunker / documentPipeline).
export async function prepareFileForUpload(file) {
  if (!file) return file;
  if (!isImageUploadFile(file)) {
    // PDF (neskôr chunknuté) alebo textový dokument — bez Image/Canvas normalizácie
    return file;
  }
  try {
    const base64 = await fileToNormalizedBase64(file);
    return base64DataUrlToBlobFile(base64, file.name);
  } catch (err) {
    console.warn('[ImageProcessor] Normalizácia obrázka zlyhala, použijem originál:', err);
    return file;
  }
}

// Normalizácia obrázku výpovede: zmena veľkosti, zvýšenie kontrastu, výstup ako Base64 (data URL).
export async function fileToNormalizedBase64(file, maxSize = 1600, contrast = 1.35, quality = 0.85) {
  const img = await loadImage(file);
  let w = img.width;
  let h = img.height;
  if (w > maxSize) { h = Math.round(h * (maxSize / w)); w = maxSize; }
  if (h > maxSize) { w = Math.round(w * (maxSize / h)); h = maxSize; }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    applyContrast(imgData, contrast);
    ctx.putImageData(imgData, 0, 0);
  } catch (_e) {
    // ak by canvas bol tainted, vráti sa aspoň bezzmenový výstup
  }
  return canvas.toDataURL('image/jpeg', quality);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyContrast(imageData, contrast) {
  const d = imageData.data;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(factor * (d[i] - 128) + 128);
    d[i + 1] = clamp(factor * (d[i + 1] - 128) + 128);
    d[i + 2] = clamp(factor * (d[i + 2] - 128) + 128);
  }
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Konverzia SVG elementu na PNG data URL (pre PDF export pavúka).
export function svgToPngBase64(svgEl, width, height) {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

// Konverzia normalized Base64 data URL späť na File — pre upload predspracovaného obrázku.
export function base64DataUrlToBlobFile(dataUrl, name) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (/data:(.*);base64/.exec(meta) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const baseName = (name || 'vypoved').replace(/\.[^.]+$/, '');
  return new File([arr], baseName + '.jpg', { type: mime });
}