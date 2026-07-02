

import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;


const FlashcardSchema = new Schema(
  {
    deck: { type: Types.ObjectId, ref: "FlashcardDeck", required: true, index: true },
    front: {
      type: String,
      required: [true, "Flashcard front is required."],
      trim: true,
      maxlength: 1000,
    },
    back: {
      type: String,
      required: [true, "Flashcard back is required."],
      trim: true,
      maxlength: 3000,
    },

    boxNumber: { type: Number, default: 1, min: 1, max: 5 },
    nextReviewDate: { type: Date, default: () => new Date(), index: true },
    lastReviewedAt: { type: Date, default: null },

    easyCount: { type: Number, default: 0, min: 0 },
    mediumCount: { type: Number, default: 0, min: 0 },
    hardCount: { type: Number, default: 0, min: 0 },

    sourceDocumentId: { type: Types.ObjectId, ref: "Document", default: null },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

FlashcardSchema.virtual("masteryScore").get(function () {
  const total = this.easyCount + this.mediumCount + this.hardCount;
  if (total === 0) return 0;
  return Math.round(((this.easyCount + this.mediumCount * 0.5) / total) * 100);
});

FlashcardSchema.index({ deck: 1, nextReviewDate: 1 });
FlashcardSchema.index({ deck: 1, boxNumber: 1 });

export const Flashcard = model("Flashcard", FlashcardSchema);


const FlashcardDeckSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    title: {
      type: String,
      required: [true, "Deck title is required."],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    subject: { type: String, trim: true, lowercase: true, index: true },
    color: { type: String, default: "#6366f1" },
    sourceDocumentId: { type: Types.ObjectId, ref: "Document", default: null },
    cardCount: { type: Number, default: 0, min: 0 },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

FlashcardDeckSchema.virtual("cards", {
  ref: "Flashcard",
  localField: "_id",
  foreignField: "deck",
  justOne: false,
});

FlashcardDeckSchema.statics.syncCardCount = async function (deckId) {
  const count = await Flashcard.countDocuments({ deck: deckId });
  await this.findByIdAndUpdate(deckId, { cardCount: count });
};

export const FlashcardDeck = model("FlashcardDeck", FlashcardDeckSchema);


const QuizQuestionSchema = new Schema(
  {
    questionText: { type: String, required: true, trim: true },
    options: {
      type: [
        {
          label: { type: String, enum: ["A", "B", "C", "D"], required: true },
          text: { type: String, required: true, trim: true },
        },
      ],
      validate: [(v) => v.length === 4, "Exactly 4 options required."],
    },
    correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
    explanation: { type: String, trim: true, maxlength: 2000 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    topic: { type: String, trim: true },
  },
  { _id: true }
);


const QuizSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    sourceDocumentId: { type: Types.ObjectId, ref: "Document", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, lowercase: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"], default: "medium" },
    questions: {
      type: [QuizQuestionSchema],
      validate: [(v) => v.length >= 1 && v.length <= 20, "Quiz must have 1–20 questions."],
    },
    totalQuestions: { type: Number },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuizSchema.pre("save", function (next) {
  this.totalQuestions = this.questions.length;
  next();
});

export const Quiz = model("Quiz", QuizSchema);


const AttemptAnswerSchema = new Schema(
  {
    questionId: { type: Types.ObjectId, required: true },
    questionText: { type: String },
    studentSelectedAnswer: { type: String, enum: ["A", "B", "C", "D", null], default: null },
    correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
    isCorrect: { type: Boolean, required: true },
    timeTaken: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema(
  {
    quiz: { type: Types.ObjectId, ref: "Quiz", required: true, index: true },
    student: { type: Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, trim: true, lowercase: true },
    answers: [AttemptAnswerSchema],

    score: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 1 },
    percentageScore: { type: Number, min: 0, max: 100 },

    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: Date.now },
    totalTimeTaken: { type: Number, default: 0 },

    difficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"] },
    passed: { type: Boolean },
    passingThreshold: { type: Number, default: 70 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

QuizAttemptSchema.pre("save", function (next) {
  this.percentageScore = Math.round((this.score / this.totalQuestions) * 100);
  this.passed = this.percentageScore >= this.passingThreshold;
  this.totalTimeTaken = this.answers.reduce((s, a) => s + (a.timeTaken ?? 0), 0);
  next();
});

QuizAttemptSchema.index({ student: 1, submittedAt: -1 });
QuizAttemptSchema.index({ student: 1, subject: 1, submittedAt: -1 });

export const QuizAttempt = model("QuizAttempt", QuizAttemptSchema);


const SubjectScoreSchema = new Schema(
  {
    subject: { type: String, required: true, trim: true },
    averageScore: { type: Number, required: true, min: 0, max: 100 },
    attemptCount: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const AnalyticsSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    totalAttempts: { type: Number, default: 0, min: 0 },
    totalCorrect: { type: Number, default: 0, min: 0 },
    totalQuestions: { type: Number, default: 0, min: 0 },

    subjectBreakdown: [SubjectScoreSchema],

    studyMinutes: { type: Number, default: 0, min: 0 },
    flashcardsReviewed: { type: Number, default: 0, min: 0 },
    flashcardMasteryGain: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AnalyticsSchema.index({ student: 1, date: -1 }, { unique: true });

AnalyticsSchema.statics.recordAttempt = async function ({
  studentId, subject, score, totalQuestions, studyMinutes = 0,
}) {
  const today = new Date(new Date().toDateString());
  const correct = Math.round((score / 100) * totalQuestions);

  const doc = await this.findOneAndUpdate(
    { student: studentId, date: today },
    {
      $inc: { totalAttempts: 1, totalCorrect: correct, totalQuestions, studyMinutes },
      $setOnInsert: { student: studentId, date: today },
    },
    { upsert: true, new: true }
  );

  doc.overallScore = doc.totalQuestions > 0
    ? Math.round((doc.totalCorrect / doc.totalQuestions) * 100)
    : 0;

  const idx = doc.subjectBreakdown.findIndex((s) => s.subject === subject);
  if (idx >= 0) {
    const s = doc.subjectBreakdown[idx];
    s.attemptCount += 1;
    s.averageScore = Math.round((s.averageScore * (s.attemptCount - 1) + score) / s.attemptCount);
  } else {
    doc.subjectBreakdown.push({ subject, averageScore: score, attemptCount: 1 });
  }

  return doc.save();
};

export const Analytics = model("Analytics", AnalyticsSchema);


const DocumentSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    subject: { type: String, trim: true, lowercase: true, default: "general" },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "text/plain" },
    chunkCount: { type: Number, default: 0, min: 0 },
    charCount: { type: Number, default: 0, min: 0 },

    extractionMethod: { type: String, enum: ["text", "ocr"], default: "text" },
  },
  { timestamps: true }
);

DocumentSchema.index({ owner: 1, createdAt: -1 });
export const Document = model("Document", DocumentSchema);


const DocumentChunkSchema = new Schema(
  {
    documentId: { type: Types.ObjectId, ref: "Document", required: true, index: true },
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true },
    chunkIndex: { type: Number, required: true, min: 0 },
  },
  { timestamps: false }
);

DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
export const DocumentChunk = model("DocumentChunk", DocumentChunkSchema);


const NotebookMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const NotebookConversationSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    documentId: { type: Types.ObjectId, ref: "Document", required: true, index: true },
    title: { type: String, default: "Notebook Chat", trim: true, maxlength: 200 },
    messages: { type: [NotebookMessageSchema], default: [] },
  },
  { timestamps: true }
);

NotebookConversationSchema.index({ owner: 1, documentId: 1 }, { unique: true });
export const NotebookConversation = model("NotebookConversation", NotebookConversationSchema);
