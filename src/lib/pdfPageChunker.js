/**
 * Client-side PDF → page JPEG chunking for Pixtral vision analysis.
 * Renders page-at-a-time (low concurrency) so a 50 MB multi-page PDF
 * does not explode heap. Uses pdf.js (pdfjs-dist) + canvas.
 */
import { mapWithConcurrency } from './forenzUtils.js';

export const PDF_MAX_PAGES = 40;
export const PDF_RENDER_MAX_EDGE = 1600;
export const PDF_JPEG_QUALITY = 0.82;
/** Keep at 1 on mobile/memory-constrained devices — one canvas at a time. */
export const PDF_RENDER_CONCURRENCY = 1;
/** How many page analyzeDocument jobs may run in parallel after upload. */
export const PDF_ANALYZE_CONCURRENCY = 2;

export function isPdfFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (type === 'application/pdf' || type === 'application/x-pdf') return true;
  return /\.pdf$/i.test(file.name || '');
}

export function buildPdfPageTitle(fileName, pageNumber, pageCount) {
  const base = String(fileName || 'dokument.pdf').replace(/\.pdf$/i, '');
  return `${base}.pdf · s. ${pageNumber}/${pageCount}`;
}

export function buildPdfContainerTitle(fileName, pageCount) {
  const name = fileName || 'dokument.pdf';
  return `${name} (${pageCount} strán)`;
}

/**
 * Groups a flat array of Document records into a hierarchical tree structure:
 * - PDF containers (source_kind === 'pdf_container') group their child pages (parent_document_id === container.id).
 * - Child pages are sorted by page_number ascending.
 * - Aggregates stats (totalPages, donePages, analyzingPages, errorPages, pendingPages, status).
 * - Standalone documents remain top-level items.
 *
 * @param {Array<object>} documents
 * @returns {Array<{ type: 'container' | 'standalone', doc: object, pages?: Array<object>, totalPages?: number, donePages?: number, analyzingPages?: number, errorPages?: number, pendingPages?: number, status?: string }>}
 */
export function buildDocumentHierarchy(documents = []) {
  if (!Array.isArray(documents) || documents.length === 0) return [];

  const containerMap = new Map();
  const childrenMap = new Map();

  // 1. Identify all container records
  documents.forEach((doc) => {
    if (!doc || typeof doc !== 'object') return;
    if (doc.source_kind === 'pdf_container') {
      containerMap.set(doc.id, doc);
      childrenMap.set(doc.id, []);
    }
  });

  // 2. Partition child pages into their respective container
  documents.forEach((doc) => {
    if (!doc || typeof doc !== 'object') return;
    if (doc.source_kind === 'pdf_container') {
      return;
    }
    const parentId = doc.parent_document_id;
    if (parentId && containerMap.has(parentId)) {
      childrenMap.get(parentId).push(doc);
    }
  });

  // 3. Assemble hierarchy preserving appearance order in original documents array
  const result = [];
  const processedContainers = new Set();

  documents.forEach((doc) => {
    if (!doc || typeof doc !== 'object') return;

    if (doc.source_kind === 'pdf_container') {
      if (processedContainers.has(doc.id)) return;
      processedContainers.add(doc.id);

      const pages = childrenMap.get(doc.id) || [];
      pages.sort((a, b) => {
        const numA = Number(a.page_number) || 0;
        const numB = Number(b.page_number) || 0;
        return numA - numB;
      });

      const totalPages = doc.page_count || pages.length || 0;
      const donePages = pages.filter((p) => p.status === 'done').length;
      const analyzingPages = pages.filter((p) => p.status === 'analyzing').length;
      const errorPages = pages.filter((p) => p.status === 'error').length;
      const pendingPages = pages.filter((p) => p.status === 'pending').length;

      let aggregatedStatus = doc.status || 'pending';
      if (errorPages > 0) {
        aggregatedStatus = 'error';
      } else if (analyzingPages > 0) {
        aggregatedStatus = 'analyzing';
      } else if (pendingPages > 0 && donePages < totalPages) {
        aggregatedStatus = 'pending';
      } else if (donePages > 0 && donePages >= totalPages) {
        aggregatedStatus = 'done';
      }

      result.push({
        type: 'container',
        doc,
        pages,
        totalPages,
        donePages,
        analyzingPages,
        errorPages,
        pendingPages,
        status: aggregatedStatus
      });
    } else if (!doc.parent_document_id || !containerMap.has(doc.parent_document_id)) {
      // Top-level standalone doc
      result.push({
        type: 'standalone',
        doc
      });
    }
  });

  return result;
}

/**
 * How many Document rows we can create for a PDF given remaining plan slots.
 * Parent container + N page docs (parent skipped when pages === 1).
 */
export function planPdfDocumentBudget(remainingSlots, pageCount, maxPages = PDF_MAX_PAGES) {
  const cappedPages = Math.min(Math.max(0, pageCount | 0), maxPages);
  const slots = remainingSlots == null || !Number.isFinite(remainingSlots)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, remainingSlots);

  if (cappedPages <= 0 || slots < 1) {
    return { ok: false, createParent: false, pages: 0, truncated: pageCount > cappedPages };
  }

  // Single page: one JPEG Document only (no container) — Pixtral needs an image.
  if (cappedPages === 1) {
    return {
      ok: true,
      createParent: false,
      pages: 1,
      truncated: pageCount > 1
    };
  }

  if (slots < 2) {
    return { ok: false, createParent: false, pages: 0, truncated: true };
  }

  const pages = Math.min(cappedPages, slots - 1);
  return {
    ok: pages >= 1,
    createParent: true,
    pages,
    truncated: pages < cappedPages || pageCount > maxPages
  };
}

let pdfjsModulePromise = null;

async function loadPdfjs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist').then(async (pdfjs) => {
      if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
        try {
          // Vite explicit asset URL bundling
          const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl || pdfjs.GlobalWorkerOptions.workerSrc;
        } catch {
          // CDN / inline fallback ak Vite asset zlyhá
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '5.7.284'}/pdf.worker.min.mjs`;
        }
      }
      return pdfjs;
    }).catch((err) => {
      pdfjsModulePromise = null;
      throw err;
    });
  }
  return pdfjsModulePromise;
}

/**
 * @returns {{ pdf: import('pdfjs-dist').PDFDocumentProxy, pageCount: number }}
 */
export async function loadPdfDocument(file) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());

  try {
    const loadingTask = pdfjs.getDocument({
      data,
      disableAutoFetch: true,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    return { pdf, pageCount: pdf.numPages || 0 };
  } catch (primaryErr) {
    console.warn('[PDF] Primárne načítanie s workerom zlyhalo, prepínam na núdzový režim:', primaryErr);
    // Núdzový fallback bez workera pri reštriktívnom CSP / iFrame sandboxe
    const fallbackTask = pdfjs.getDocument({
      data,
      disableAutoFetch: true,
      disableFontFace: true,
      useSystemFonts: false
    });
    const pdf = await fallbackTask.promise;
    return { pdf, pageCount: pdf.numPages || 0 };
  }
}

/**
 * Render one PDF page to a JPEG File, then release canvas memory.
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 */
export async function renderPdfPageToFile(pdf, pageNumber, opts = {}) {
  const maxEdge = opts.maxEdge ?? PDF_RENDER_MAX_EDGE;
  const quality = opts.quality ?? PDF_JPEG_QUALITY;
  const fileName = opts.fileName || 'page.pdf';

  const page = await pdf.getPage(pageNumber);
  let canvas = null;
  try {
    const baseViewport = page.getViewport({ scale: 1 });
    const longest = Math.max(baseViewport.width, baseViewport.height) || 1;
    const scale = Math.min(2, maxEdge / longest);
    const viewport = page.getViewport({ scale: Math.max(0.4, scale) });

    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas_2d_unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas_toBlob_failed'))),
        'image/jpeg',
        quality
      );
    });

    const stem = String(fileName).replace(/\.pdf$/i, '') || 'stranka';
    return new File([blob], `${stem}_p${pageNumber}.jpg`, { type: 'image/jpeg' });
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    try {
      page.cleanup();
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * Walk PDF pages sequentially (or with tiny concurrency) and await onPage
 * for each rendered File. Does not accumulate all page Files in memory.
 *
 * @param {File|Blob} file
 * @param {(ctx: { pageNumber: number, pageCount: number, originalPageCount: number, file: File }) => Promise<void>} onPage
 * @param {{ maxPages?: number, pagesLimit?: number, renderConcurrency?: number, maxEdge?: number, quality?: number, signal?: AbortSignal, isAborted?: () => boolean }} [options]
 */
export async function forEachPdfPage(file, onPage, options = {}) {
  const maxPages = options.maxPages ?? PDF_MAX_PAGES;
  const signal = options.signal;
  const isAborted = () => Boolean(signal?.aborted || options.isAborted?.());

  if (isAborted()) {
    return { pageCount: 0, originalPageCount: 0, truncated: false, aborted: true };
  }

  const { pdf, pageCount } = await loadPdfDocument(file);
  const pagesLimit = options.pagesLimit != null
    ? Math.min(pageCount, maxPages, options.pagesLimit)
    : Math.min(pageCount, maxPages);
  const renderConcurrency = Math.max(1, options.renderConcurrency ?? PDF_RENDER_CONCURRENCY);

  let renderedCount = 0;
  try {
    if (pagesLimit < 1) {
      return { pageCount: 0, originalPageCount: pageCount, truncated: pageCount > 0, aborted: false };
    }

    const pageNumbers = Array.from({ length: pagesLimit }, (_, i) => i + 1);
    await mapWithConcurrency(pageNumbers, renderConcurrency, async (pageNumber) => {
      if (isAborted()) return;

      const pageFile = await renderPdfPageToFile(pdf, pageNumber, {
        fileName: file.name,
        maxEdge: options.maxEdge,
        quality: options.quality
      });

      if (isAborted()) return;

      await onPage({
        pageNumber,
        pageCount: pagesLimit,
        originalPageCount: pageCount,
        file: pageFile
      });
      renderedCount++;
    });

    if (isAborted()) {
      return {
        pageCount: renderedCount,
        originalPageCount: pageCount,
        truncated: true,
        aborted: true
      };
    }

    return {
      pageCount: pagesLimit,
      originalPageCount: pageCount,
      truncated: pageCount > pagesLimit,
      aborted: false
    };
  } finally {
    try {
      await pdf.destroy();
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * Full PDF upload path: load once → budget slots → optional parent Document →
 * page-at-a-time render/upload/create/analyze. Releases pdf.js document in finally.
 *
 * @param {File} file
 * @param {{
 *   remainingSlots: number,
 *   maxPages?: number,
 *   pageConcurrency?: number,
 *   signal?: AbortSignal,
 *   isAborted?: () => boolean,
 *   uploadBinary: (f: File|Blob) => Promise<string>,
 *   createDocument: (fields: object) => Promise<object>,
 *   analyzeDocument?: (doc: object) => Promise<unknown>,
 *   onPageProgress?: (info: { pageNumber: number, pageCount: number, originalPageCount?: number, stage?: 'rendering' | 'uploading' | 'analyzing' | 'done', percent?: number, statusText?: string }) => void,
 * }} handlers
 */
export async function chunkAndProcessPdf(file, handlers = {}) {
  const maxPages = handlers.maxPages ?? PDF_MAX_PAGES;
  const pageConcurrency = Math.max(1, handlers.pageConcurrency ?? PDF_RENDER_CONCURRENCY);
  const signal = handlers.signal;
  const isAborted = () => Boolean(signal?.aborted || handlers.isAborted?.());

  if (isAborted()) {
    return {
      ok: false,
      aborted: true,
      reason: 'aborted',
      pageCount: 0,
      originalPageCount: 0,
      truncated: false
    };
  }

  const { pdf, pageCount } = await loadPdfDocument(file);
  const budget = planPdfDocumentBudget(handlers.remainingSlots, pageCount, maxPages);

  if (!budget.ok) {
    try { await pdf.destroy(); } catch (_) { /* ignore */ }
    return {
      ok: false,
      reason: 'slots',
      pageCount: 0,
      originalPageCount: pageCount,
      truncated: true,
      aborted: false
    };
  }

  let parentDoc = null;
  const completedPageDocs = [];

  try {
    if (isAborted()) {
      return {
        ok: false,
        aborted: true,
        reason: 'aborted',
        pageCount: 0,
        originalPageCount: pageCount,
        truncated: true
      };
    }

    if (budget.createParent) {
      const parentUrl = await handlers.uploadBinary(file);
      if (isAborted()) {
        return {
          ok: false,
          aborted: true,
          reason: 'aborted',
          pageCount: 0,
          originalPageCount: pageCount,
          truncated: true
        };
      }
      parentDoc = await handlers.createDocument({
        title: buildPdfContainerTitle(file.name, budget.pages),
        image_url: parentUrl,
        status: 'done',
        source_kind: 'pdf_container',
        page_count: budget.pages,
        summary: `PDF kontajner · ${budget.pages} stránok pripravených na AI analýzu`
      });
    }

    const pageNumbers = Array.from({ length: budget.pages }, (_, i) => i + 1);

    await mapWithConcurrency(pageNumbers, pageConcurrency, async (pageNumber) => {
      if (isAborted()) return;

      const calcPercent = (stageMultiplier) => {
        const stepPerChunk = 100 / budget.pages;
        const base = (pageNumber - 1) * stepPerChunk;
        return Math.min(100, Math.max(1, Math.round(base + (stepPerChunk * stageMultiplier))));
      };

      // Phase 1: Rendering JPEG
      if (handlers.onPageProgress) {
        handlers.onPageProgress({
          pageNumber,
          pageCount: budget.pages,
          originalPageCount: pageCount,
          stage: 'rendering',
          percent: calcPercent(0.25),
          statusText: `Strana ${pageNumber}/${budget.pages}: Renderovanie... [${calcPercent(0.25)}%]`
        });
      }

      const pageFile = await renderPdfPageToFile(pdf, pageNumber, {
        fileName: file.name,
        maxEdge: handlers.maxEdge,
        quality: handlers.quality
      });

      if (isAborted()) return;

      // Phase 2: Uploading JPEG
      if (handlers.onPageProgress) {
        handlers.onPageProgress({
          pageNumber,
          pageCount: budget.pages,
          originalPageCount: pageCount,
          stage: 'uploading',
          percent: calcPercent(0.5),
          statusText: `Strana ${pageNumber}/${budget.pages}: Nahrávanie... [${calcPercent(0.5)}%]`
        });
      }

      const pageUrl = await handlers.uploadBinary(pageFile);

      if (isAborted()) return;

      const pageDoc = await handlers.createDocument({
        title: buildPdfPageTitle(file.name, pageNumber, budget.pages),
        image_url: pageUrl,
        status: 'pending',
        source_kind: 'pdf_page',
        parent_document_id: parentDoc?.id || '',
        page_number: pageNumber,
        page_count: budget.pages
      });

      completedPageDocs.push(pageDoc);

      if (isAborted()) return;

      // Phase 3: AI extraction
      if (handlers.onPageProgress) {
        handlers.onPageProgress({
          pageNumber,
          pageCount: budget.pages,
          originalPageCount: pageCount,
          stage: 'analyzing',
          percent: calcPercent(0.75),
          statusText: `Strana ${pageNumber}/${budget.pages}: AI extrakcia... [${calcPercent(0.75)}%]`
        });
      }

      if (handlers.analyzeDocument) {
        await handlers.analyzeDocument(pageDoc, pageFile);
      }

      // Phase 4: Done page
      if (handlers.onPageProgress) {
        handlers.onPageProgress({
          pageNumber,
          pageCount: budget.pages,
          originalPageCount: pageCount,
          stage: 'done',
          percent: calcPercent(1.0),
          statusText: `Strana ${pageNumber}/${budget.pages}: Hotovo [${calcPercent(1.0)}%]`
        });
      }
    });

    if (isAborted()) {
      return {
        ok: false,
        aborted: true,
        reason: 'aborted',
        parentDoc,
        pageDocs: completedPageDocs,
        pageCount: completedPageDocs.length,
        originalPageCount: pageCount,
        truncated: true
      };
    }

    return {
      ok: true,
      aborted: false,
      parentDoc,
      pageDocs: completedPageDocs,
      pageCount: budget.pages,
      originalPageCount: pageCount,
      truncated: budget.truncated || pageCount > maxPages
    };
  } finally {
    try {
      await pdf.destroy();
    } catch (_) {
      /* ignore */
    }
  }
}
