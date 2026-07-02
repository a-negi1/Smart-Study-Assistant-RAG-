

import multer from "multer";
import { Document, DocumentChunk, NotebookConversation } from "../models/Study.models.js";
import { extractText } from "../utils/textExtraction.js";


const ALLOWED_MIMES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "image/png",
  "image/jpeg",
  "image/webp",
];
const ALLOWED_EXTS = ["txt", "md", "pdf", "docx", "png", "jpg", "jpeg", "webp"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      const err = new Error(
        "Only PDF, Word (.docx), TXT, Markdown, or photo (PNG/JPG/WEBP) files are supported."
      );
      err.statusCode = 400;
      cb(err);
    }
  },
});


const CHUNK_WORDS = 500;

function chunkText(text) {

  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const words = clean.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += CHUNK_WORDS) {
    const slice = words.slice(i, i + CHUNK_WORDS).join(" ");
    if (slice.trim().length > 20) {
      chunks.push(slice);
    }
  }
  return chunks;
}


export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file attached. Send the file under the key 'file'." });
    }

    const { title, subject = "general" } = req.body;
    const { originalname, mimetype, buffer } = req.file;


    const { text: rawText, method, kind, parseError } = await extractText(buffer, mimetype, originalname);

    if (parseError) {
      return res.status(422).json({
        error:
          kind === "docx"
            ? "Could not read this Word document. Make sure it's a valid, non-corrupted .docx file (old .doc files aren't supported — re-save as .docx)."
            : "Could not read this file. Please try a different one.",
      });
    }

    if (!rawText.trim()) {
      return res.status(422).json({
        error:
          kind === "pdf"
            ? "Could not extract any text from this PDF, even with OCR. It may be blank, heavily corrupted, or too low-resolution to read. Try uploading clear photos of the pages instead."
            : kind === "image"
              ? "Could not read any text in this image. Try a clearer, well-lit, higher-resolution photo."
              : "Uploaded file appears to be empty or unreadable.",
      });
    }


    const docTitle = (title ?? "").trim() || originalname.replace(/\.[^.]+$/, "");
    const doc = await Document.create({
      owner: req.user._id,
      title: docTitle,
      subject: subject.toLowerCase().trim(),
      fileName: originalname,
      mimeType: mimetype,
      charCount: rawText.length,
      extractionMethod: method,
    });


    const textChunks = chunkText(rawText);
    const chunkDocs = textChunks.map((text, chunkIndex) => ({
      documentId: doc._id,
      owner: req.user._id,
      text,
      chunkIndex,
    }));

    if (chunkDocs.length) {
      await DocumentChunk.insertMany(chunkDocs, { ordered: false });
    }


    doc.chunkCount = chunkDocs.length;
    await doc.save();

    return res.status(201).json({
      success: true,
      documentId: doc._id,
      title: doc.title,
      subject: doc.subject,
      fileName: doc.fileName,
      chunkCount: doc.chunkCount,
      charCount: doc.charCount,
      extractionMethod: doc.extractionMethod,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    next(err);
  }
};


export const listDocuments = async (req, res, next) => {
  try {
    const docs = await Document.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: docs.length, documents: docs });
  } catch (err) {
    next(err);
  }
};


export const deleteDocument = async (req, res, next) => {
  try {
    const { docId } = req.params;

    const doc = await Document.findOne({ _id: docId, owner: req.user._id });
    if (!doc) return res.status(404).json({ error: "Document not found." });


    await Promise.all([
      DocumentChunk.deleteMany({ documentId: docId }),
      NotebookConversation.deleteMany({ documentId: docId }),
      doc.deleteOne(),
    ]);

    return res.json({ success: true, message: "Document and all associated data deleted." });
  } catch (err) {
    next(err);
  }
};
