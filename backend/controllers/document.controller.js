

import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { Document, DocumentChunk, NotebookConversation } from "../models/Study.models.js";


export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/x-markdown",
    ];
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (allowed.includes(file.mimetype) || ["txt", "md", "pdf"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, or Markdown files are supported."));
    }
  },
});


const CHUNK_WORDS = 500;

function chunkText(text) {

  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const words  = clean.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += CHUNK_WORDS) {
    const slice = words.slice(i, i + CHUNK_WORDS).join(" ");
    if (slice.trim().length > 20) {   // skip near-empty chunks
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

    
    let rawText = "";
    const isPDF = mimetype === "application/pdf" ||
                  originalname.toLowerCase().endsWith(".pdf");

    if (isPDF) {
      try {
        const data = await pdfParse(buffer);
        rawText    = data.text ?? "";
      } catch (pdfErr) {
        return res.status(422).json({
          error: "Could not extract text from the PDF. Make sure it is not scanned/image-only.",
        });
      }
    } else {
      rawText = buffer.toString("utf-8");
    }

    if (!rawText.trim()) {
      return res.status(422).json({ error: "Uploaded file appears to be empty or unreadable." });
    }

    
    const docTitle = (title ?? "").trim() || originalname.replace(/\.[^.]+$/, "");
    const doc = await Document.create({
      owner:    req.user._id,
      title:    docTitle,
      subject:  subject.toLowerCase().trim(),
      fileName: originalname,
      mimeType: mimetype,
      charCount: rawText.length,
    });

    
    const textChunks = chunkText(rawText);
    const chunkDocs  = textChunks.map((text, chunkIndex) => ({
      documentId: doc._id,
      owner:      req.user._id,
      text,
      chunkIndex,
    }));

    if (chunkDocs.length) {
      await DocumentChunk.insertMany(chunkDocs, { ordered: false });
    }

    
    doc.chunkCount = chunkDocs.length;
    await doc.save();

    return res.status(201).json({
      success:    true,
      documentId: doc._id,
      title:      doc.title,
      subject:    doc.subject,
      fileName:   doc.fileName,
      chunkCount: doc.chunkCount,
      charCount:  doc.charCount,
      createdAt:  doc.createdAt,
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
