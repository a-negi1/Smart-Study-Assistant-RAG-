import mongoose from "mongoose";
import { Flashcard, FlashcardDeck } from "../models/Study.models.js";
import { groqJSON, applyFlashcardRating } from "../utils/index.js";

const FLASHCARD_SYSTEM_PROMPT = `
You are a senior academic tutor who distils complex study material into concise, exam-focused flashcards.

TASK: Analyse the provided text and extract the 10 most important, high-yield concepts.

OUTPUT RULES — FOLLOW EXACTLY:
1. Respond with a single valid JSON object. No markdown. No preamble. No trailing text.
2. Root key must be "flashcards" — an array of exactly 10 items.
3. Each item must match this TypeScript interface:

interface Flashcard {
  front: string;       // focused question or concept prompt (max 150 chars)
  back: string;        // thorough, self-contained answer with brief example if helpful (max 400 chars)
  topic: string;       // specific sub-topic this card covers
  tags: string[];      // 1-3 lowercase keyword tags
  difficulty: "easy" | "medium" | "hard";
}

QUALITY RULES:
- front must be unambiguous and self-contained.
- back must not require the source text to make sense.
- Prioritise concepts that are foundational, frequently tested, or commonly misunderstood.
- Distribute difficulty: ~3 easy, ~4 medium, ~3 hard.
- No two cards should test the same concept from the same angle.
`.trim();

export const generateDeck = async (req, res, next) => {
  try {
    const { text, deckTitle = "New Deck", subject = "general", documentId = null } = req.body;

    let safeText = "";
    let docSubject = subject;
    let docTitle   = deckTitle;

    if (documentId) {

      if (!mongoose.isValidObjectId(documentId)) {
        return res.status(400).json({ error: "Invalid documentId." });
      }
      const DocumentChunk = mongoose.model("DocumentChunk");
      const Document      = mongoose.model("Document");

      const doc = await Document.findOne({ _id: documentId, owner: req.user._id }).lean();
      if (!doc) {
        return res.status(404).json({ error: "Document not found or does not belong to you." });
      }

      const chunks = await DocumentChunk.find({ documentId })
        .sort({ chunkIndex: 1 })
        .limit(10)
        .select("text -_id")
        .lean();

      safeText   = chunks.map((c) => c.text).join("\n\n").trim().slice(0, 12000);
      docSubject = doc.subject ?? subject;
      docTitle   = deckTitle !== "New Deck" ? deckTitle : doc.title;

      if (!safeText) {
        return res.status(404).json({ error: "No text found for this document. Please re-upload." });
      }
    } else {

      if (!text || typeof text !== "string" || text.trim().length < 100) {
        return res.status(400).json({ error: "Provide at least 100 characters of study material." });
      }
      safeText = text.trim().slice(0, 12000);
    }

    const parsed = await groqJSON({
      systemPrompt: FLASHCARD_SYSTEM_PROMPT,
      userPrompt:   `STUDY MATERIAL:\n${safeText}\n\nExtract the 10 most important flashcard pairs.`,
      temperature:  0.35,
      maxTokens:    3000,
    });


    if (
      !Array.isArray(parsed?.flashcards) ||
      parsed.flashcards.length < 1 ||
      parsed.flashcards.some((c) => !c.front?.trim() || !c.back?.trim())
    ) {
      return res.status(502).json({ error: "AI returned an invalid flashcard structure. Please retry." });
    }


    const deck = await FlashcardDeck.create({
      owner:            req.user._id,
      title:            docTitle,
      subject:          docSubject.toLowerCase(),
      sourceDocumentId: documentId ?? undefined,
      cardCount:        parsed.flashcards.length,
    });


    const cardDocs = await Flashcard.insertMany(
      parsed.flashcards.map((c) => ({
        deck:             deck._id,
        front:            c.front.trim().slice(0, 1000),
        back:             c.back.trim().slice(0, 3000),
        tags:             Array.isArray(c.tags) ? c.tags.slice(0, 3) : [],
        sourceDocumentId: documentId ?? undefined,
        boxNumber:        1,
        nextReviewDate:   new Date(),
      }))
    );

    return res.status(201).json({
      success:   true,
      deckId:    deck._id,
      deckTitle: deck.title,
      cardCount: cardDocs.length,
      flashcards: cardDocs.map((card, i) => ({
        _id:            card._id,
        front:          card.front,
        back:           card.back,
        tags:           card.tags,
        boxNumber:      card.boxNumber,
        nextReviewDate: card.nextReviewDate,
        difficulty:     parsed.flashcards[i]?.difficulty ?? "medium",
        topic:          parsed.flashcards[i]?.topic ?? docSubject,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const reviewCard = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { rating } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid flashcard ID." });
    }
    if (!["Easy", "Medium", "Hard"].includes(rating)) {
      return res.status(400).json({ error: "rating must be Easy | Medium | Hard." });
    }


    const card = await Flashcard.findById(id).populate("deck", "owner");
    if (!card) return res.status(404).json({ error: "Flashcard not found." });

    if (card.deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    const updated = await applyFlashcardRating(card, rating);

    return res.json({
      success:        true,
      cardId:         updated._id,
      newBoxNumber:   updated.boxNumber,
      nextReviewDate: updated.nextReviewDate,
      masteryScore:   updated.masteryScore,
    });
  } catch (err) {
    next(err);
  }
};

export const getDueCards = async (req, res, next) => {
  try {
    const { deckId } = req.query;
    const deckQuery  = { owner: req.user._id, isArchived: false };

    if (deckId) {
      if (!mongoose.isValidObjectId(deckId)) {
        return res.status(400).json({ error: "Invalid deckId." });
      }
      deckQuery._id = deckId;
    }

    const deckIds  = await FlashcardDeck.find(deckQuery).distinct("_id");
    const dueCards = await Flashcard.find({
      deck:           { $in: deckIds },
      nextReviewDate: { $lte: new Date() },
    })
      .populate("deck", "title subject color")
      .sort({ boxNumber: 1, nextReviewDate: 1 })
      .lean();

    return res.json({ success: true, dueCount: dueCards.length, cards: dueCards });
  } catch (err) {
    next(err);
  }
};

export const listDecks = async (req, res, next) => {
  try {
    const decks = await FlashcardDeck.find({ owner: req.user._id, isArchived: false })
      .sort({ createdAt: -1 })
      .lean();

    const now      = new Date();
    const enriched = await Promise.all(
      decks.map(async (deck) => {
        const dueCount = await Flashcard.countDocuments({
          deck:           deck._id,
          nextReviewDate: { $lte: now },
        });
        return { ...deck, dueCount };
      })
    );

    return res.json({ success: true, decks: enriched });
  } catch (err) {
    next(err);
  }
};

export const getDeckCards = async (req, res, next) => {
  try {
    const { deckId } = req.params;
    if (!mongoose.isValidObjectId(deckId)) {
      return res.status(400).json({ error: "Invalid deckId." });
    }

    const deck = await FlashcardDeck.findOne({ _id: deckId, owner: req.user._id }).lean();
    if (!deck) return res.status(404).json({ error: "Deck not found." });

    const cards = await Flashcard.find({ deck: deckId })
      .sort({ boxNumber: 1, nextReviewDate: 1 })
      .lean();

    return res.json({ success: true, deck, cards });
  } catch (err) {
    next(err);
  }
};
