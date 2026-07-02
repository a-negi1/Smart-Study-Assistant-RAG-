

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

const MIN_TEXT_LENGTH_BEFORE_OCR = 50;
const MAX_OCR_PAGES = 15;
const OCR_RENDER_SCALE = 2;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp"];


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
  const [{ createCanvas }, pdfjsLib] = await Promise.all([
    import("@napi-rs/canvas"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);

  const worker = await getOcrWorker();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);

  let combined = "";
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
    const canvas = createCanvas(viewport.width, viewport.height);

    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    const { data } = await worker.recognize(canvas.toBuffer("image/png"));
    combined += `${data.text ?? ""}\n\n`;
  }

  return combined.trim();
}


export async function extractText(buffer, mimetype, originalname) {
  const kind = detectFileKind(mimetype, originalname);

  if (kind === "pdf") {
    let text = "";
    try {
      const data = await pdfParse(buffer);
      text = (data.text ?? "").trim();
    } catch {
      text = "";
    }

    if (text.length >= MIN_TEXT_LENGTH_BEFORE_OCR) {
      return { text, method: "text", kind };
    }


    try {
      const ocrText = await ocrPdfPages(buffer);
      if (ocrText.length > text.length) {
        return { text: ocrText, method: "ocr", kind };
      }
    } catch (ocrErr) {
      console.error("[textExtraction] PDF OCR fallback unavailable/failed:", ocrErr.message);
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
