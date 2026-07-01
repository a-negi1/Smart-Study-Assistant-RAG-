
import mongoose from "mongoose";
import { NotebookConversation, Document, DocumentChunk } from "../models/Study.models.js";
import { groqJSON } from "../utils/index.js";
import Groq from "groq-sdk";

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });


function buildNotebookSystemPrompt(docTitle, docSubject, contextText) {
  return `
You are an intelligent AI study assistant analyzing the document titled: "${docTitle}" (subject: ${docSubject}).

Your role is to answer the user's questions accurately and helpfully using ONLY the provided document context below.

DOCUMENT CONTEXT:
${contextText}

RULES:
1. Base your answers strictly on the document context above.
2. If the answer is not in the document, say: "The document doesn't cover that topic."
3. Be concise but thorough. Use bullet points or numbered lists when helpful.
4. For complex topics, explain step-by-step.
5. If asked for examples, try to derive them from the document context.
6. Respond in plain text (no markdown). Keep responses under 400 words unless more detail is genuinely needed.
`.trim();
}


async function retrieveChunks(documentId, query) {
  let chunks = [];

  try {
    chunks = await DocumentChunk.aggregate([
      {
        $search: {
          index: "default",
          compound: {
            must: [{ text: { query, path: "text" } }],
            filter: [{ equals: { path: "documentId", value: new mongoose.Types.ObjectId(documentId) } }],
          },
        },
      },
      { $limit: 6 },
      { $project: { text: 1, _id: 0 } },
    ]);
  } catch (_searchErr) {
    
  }

  if (!chunks.length) {
    chunks = await DocumentChunk.find({ documentId })
      .sort({ chunkIndex: 1 })
      .limit(6)
      .select("text -_id")
      .lean();
  }

  return chunks.map((c) => c.text).join("\n\n---\n\n");
}


export const getConversation = async (req, res, next) => {
  try {
    const { docId } = req.params;
    if (!mongoose.isValidObjectId(docId)) {
      return res.status(400).json({ error: "Invalid document ID." });
    }

    const doc = await Document.findOne({ _id: docId, owner: req.user._id }).lean();
    if (!doc) return res.status(404).json({ error: "Document not found." });

    let conversation = await NotebookConversation.findOne({
      owner:      req.user._id,
      documentId: docId,
    }).lean();

    if (!conversation) {
      conversation = await NotebookConversation.create({
        owner:      req.user._id,
        documentId: docId,
        title:      `Chat about: ${doc.title}`,
      });
    }

    return res.json({
      success:      true,
      conversation: {
        _id:        conversation._id,
        title:      conversation.title,
        messages:   conversation.messages ?? [],
        document:   { _id: doc._id, title: doc.title, subject: doc.subject, chunkCount: doc.chunkCount },
      },
    });
  } catch (err) {
    next(err);
  }
};


export const chat = async (req, res, next) => {
  try {
    const { docId }  = req.params;
    const { message } = req.body;

    if (!mongoose.isValidObjectId(docId)) {
      return res.status(400).json({ error: "Invalid document ID." });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    const userMessage = message.trim().slice(0, 2000); // cap input

    const doc = await Document.findOne({ _id: docId, owner: req.user._id }).lean();
    if (!doc) return res.status(404).json({ error: "Document not found." });

    
    const contextText = await retrieveChunks(docId, userMessage);

    
    let conv = await NotebookConversation.findOne({
      owner:      req.user._id,
      documentId: docId,
    });
    if (!conv) {
      conv = new NotebookConversation({
        owner:      req.user._id,
        documentId: docId,
        title:      `Chat about: ${doc.title}`,
      });
    }

    
    conv.messages.push({ role: "user", content: userMessage });

  
    const systemPrompt = buildNotebookSystemPrompt(doc.title, doc.subject, contextText);
    const historyTurns = conv.messages.slice(-20).map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    const completion = await groqClient.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens:  1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyTurns,
      ],
    });

    const aiReply = completion.choices[0]?.message?.content?.trim() ??
      "I'm sorry, I couldn't generate a response. Please try again.";

    
    conv.messages.push({ role: "assistant", content: aiReply });
    await conv.save();

    return res.json({
      success: true,
      reply:   aiReply,
      messageId: conv.messages[conv.messages.length - 1]._id,
    });
  } catch (err) {
    next(err);
  }
};


export const deleteConversation = async (req, res, next) => {
  try {
    const { convId } = req.params;

    await NotebookConversation.findOneAndUpdate(
      { _id: convId, owner: req.user._id },
      { $set: { messages: [] } }
    );

    return res.json({ success: true, message: "Conversation cleared." });
  } catch (err) {
    next(err);
  }
};
