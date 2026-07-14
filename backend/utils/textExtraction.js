import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import mupdf from "mupdf";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp"];
const MAX_OCR_PAGES = 15;
const OCR_RENDER_SCALE = 2;
const MIN_TEXT_LENGTH_BEFORE_OCR = 50;

let workerPromise = null;
function getOcrWorker() {
  if (!workerPromise) workerPromise = createWorker("eng");
  return workerPromise;
}

export function detectFileKind(mimetype, originalname) {
  const ext = (originalname.split(".").pop() || "").toLowerCase();
  if (mimetype === "application/pdf" || ext === "pdf") return "pdf";
  if (mimetype === DOCX_MIME || ext === "docx") return "docx";
  if (IMAGE_MIMES.includes(mimetype) || IMAGE_EXTS.includes(ext)) return "image";
  return "text";
}

async function ocrPdfPages(buffer) {
  const ocrWorker = await getOcrWorker();
  const doc = mupdf.Document.openDocument(new Uint8Array(buffer), "application/pdf");
  const pageCount = Math.min(doc.countPages(), MAX_OCR_PAGES);
  const scale = mupdf.Matrix.scale(OCR_RENDER_SCALE, OCR_RENDER_SCALE);

  let combined = "";
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const pixmap = page.toPixmap(scale, mupdf.ColorSpace.DeviceRGB, false, true);
    const pngBuffer = Buffer.from(pixmap.asPNG());
    const { data } = await ocrWorker.recognize(pngBuffer);
    combined += `${data.text ?? ""}\n\n`;
  }

  return combined.trim();
}

async function parsePdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return (data.text ?? "").replace(/--\s*\d+\s+of\s+\d+\s*--/g, "").trim();
  } catch {
    return "";
  }
}

export async function extractText(buffer, mimetype, originalname) {
  const kind = detectFileKind(mimetype, originalname);

  if (kind === "pdf") {
    let text = await parsePdfText(buffer);

    if (text.length >= MIN_TEXT_LENGTH_BEFORE_OCR) {
      return { text, method: "text", kind };
    }

    try {
      const ocrText = await ocrPdfPages(buffer);
      if (ocrText.length > text.length) {
        return { text: ocrText, method: "ocr", kind };
      }
    } catch (ocrErr) {
      console.error("[textExtraction] PDF OCR fallback failed:", ocrErr.message);
    }

    return { text, method: "text", kind };
  }

  if (kind === "docx") {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      return { text: (value ?? "").trim(), method: "text", kind };
    } catch (err) {
      console.error("[textExtraction] DOCX parse failed:", err.message);
      return { text: "", method: "text", kind, parseError: true };
    }
  }

  if (kind === "image") {
    try {
      const worker = await getOcrWorker();
      const { data } = await worker.recognize(buffer);
      return { text: (data.text ?? "").trim(), method: "ocr", kind };
    } catch (err) {
      console.error("[textExtraction] Image OCR failed:", err.message);
      return { text: "", method: "ocr", kind, parseError: true };
    }
  }

  return { text: buffer.toString("utf-8"), method: "text", kind };
}

export async function shutdownOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
