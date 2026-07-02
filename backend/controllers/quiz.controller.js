
import mongoose from "mongoose";
import { Quiz, QuizAttempt, Analytics } from "../models/Study.models.js";
import { groqJSON, assembleContext } from "../utils/index.js";


function buildQuizSystemPrompt(difficulty) {
  const depthGuide = {
    easy: "Test foundational definitions and recognition of key terms.",
    medium: "Test application of concepts to realistic scenarios.",
    hard: "Test analysis, synthesis, and edge-case reasoning.",
  }[difficulty];

  return `
You are an expert academic question designer for university-level study materials.

TASK: Generate exactly 5 multiple-choice questions (MCQs) using ONLY the provided document context.

OUTPUT RULES — FOLLOW EXACTLY:
1. Output a single valid JSON object. No markdown. No preamble. No extra text.
2. Root key must be "questions" — an array of exactly 5 items.
3. Each item must match this TypeScript interface exactly:

interface Question {
  questionText: string;
  options: { label: "A"|"B"|"C"|"D"; text: string }[];  // exactly 4
  correctAnswer: "A"|"B"|"C"|"D";
  explanation: string;   // 1-2 sentences explaining the correct answer
  topic: string;         // specific sub-topic this question tests
  difficulty: "${difficulty}";
}

QUALITY RULES:
- Questions must test understanding, NOT trivial recall.
- Distractors must be plausible — based on common misconceptions.
- All 4 options must be roughly equal in length.
- Spread correct answers evenly: avoid repeating the same label consecutively.
- Depth: ${depthGuide}
`.trim();
}


export const generateQuiz = async (req, res, next) => {
  try {
    const { documentId, difficulty = "medium" } = req.body;

    if (!mongoose.isValidObjectId(documentId)) {
      return res.status(400).json({ error: "A valid documentId is required." });
    }
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "difficulty must be easy | medium | hard." });
    }


    const DocumentChunk = mongoose.model("DocumentChunk");

    let chunks = [];
    try {
      chunks = await DocumentChunk.aggregate([
        {
          $search: {
            index: "default",
            compound: {
              must: [
                {
                  text: {
                    query: "main concepts definitions principles overview key terms",
                    path: "text",
                  },
                },
              ],
              filter: [
                {
                  equals: { path: "documentId", value: new mongoose.Types.ObjectId(documentId) },
                },
              ],
            },
          },
        },
        { $limit: 8 },
        { $project: { text: 1, score: { $meta: "searchScore" }, _id: 0 } },
      ]);
    } catch (searchErr) {

      console.warn("[quiz.generate] Atlas $search unavailable, falling back to find():", searchErr.message);
    }


    const effectiveChunks = chunks.length
      ? chunks
      : await DocumentChunk.find({ documentId })
        .select("text -_id")
        .limit(8)
        .lean();

    if (!effectiveChunks.length) {
      return res.status(404).json({ error: "No content found for this document. Please re-upload." });
    }


    const parsed = await groqJSON({
      systemPrompt: buildQuizSystemPrompt(difficulty),
      userPrompt: `DOCUMENT CONTEXT:\n${assembleContext(effectiveChunks)}\n\nGenerate 5 ${difficulty}-level MCQs strictly from the content above.`,
      temperature: 0.4,
      maxTokens: 2500,
    });


    const valid =
      Array.isArray(parsed?.questions) &&
      parsed.questions.length === 5 &&
      parsed.questions.every(
        (q) =>
          q.questionText &&
          Array.isArray(q.options) && q.options.length === 4 &&
          ["A", "B", "C", "D"].includes(q.correctAnswer)
      );

    if (!valid) {
      return res.status(502).json({ error: "AI returned an invalid quiz structure. Please retry." });
    }


    const Document = mongoose.model("Document");
    const doc = await Document.findById(documentId).select("title subject").lean();


    const quiz = await Quiz.create({
      owner: req.user._id,
      sourceDocumentId: documentId,
      title: `${doc?.title ?? "Untitled"} — ${difficulty.toUpperCase()} Quiz`,
      subject: doc?.subject ?? "general",
      difficulty,
      questions: parsed.questions.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic,
        difficulty,
      })),
    });



    const plainQuiz = quiz.toObject();
    return res.status(201).json({
      success: true,
      quizId: plainQuiz._id,
      title: plainQuiz.title,
      difficulty: plainQuiz.difficulty,
      questions: plainQuiz.questions.map(({ correctAnswer: _ca, explanation: _ex, ...safe }) => ({
        ...safe,
        _id: safe._id?.toString(),
        options: safe.options.map(({ _id: oId, ...opt }) => opt), // strip option _ids
      })),
    });
  } catch (err) {
    next(err);
  }
};


export const submitAttempt = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers, startedAt } = req.body;

    if (!mongoose.isValidObjectId(quizId)) {
      return res.status(400).json({ error: "Invalid quizId." });
    }

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return res.status(404).json({ error: "Quiz not found." });


    const scoredAnswers = quiz.questions.map((q) => {
      const submission = answers?.find((a) => a.questionId === q._id.toString());
      const selected = submission?.studentSelectedAnswer ?? null;
      return {
        questionId: q._id,
        questionText: q.questionText,
        studentSelectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect: selected === q.correctAnswer,
        timeTaken: submission?.timeTaken ?? 0,
      };
    });

    const correctCount = scoredAnswers.filter((a) => a.isCorrect).length;

    const attempt = await QuizAttempt.create({
      quiz: quizId,
      student: req.user._id,
      subject: quiz.subject,
      answers: scoredAnswers,
      score: correctCount,
      totalQuestions: quiz.questions.length,
      difficulty: quiz.difficulty,
      startedAt: new Date(startedAt),
    });


    Analytics.recordAttempt({
      studentId: req.user._id,
      subject: quiz.subject,
      score: attempt.percentageScore,
      totalQuestions: quiz.questions.length,
    }).catch((e) => console.error("[Analytics.recordAttempt]", e));

    return res.status(201).json({
      success: true,
      attemptId: attempt._id,
      score: correctCount,
      totalQuestions: quiz.questions.length,
      percentageScore: attempt.percentageScore,
      passed: attempt.passed,
      timeTaken: attempt.totalTimeTaken,
      breakdown: scoredAnswers.map((a, i) => ({
        ...a,
        explanation: quiz.questions[i]?.explanation ?? "",
        topic: quiz.questions[i]?.topic ?? "",
      })),
    });
  } catch (err) {
    next(err);
  }
};


export const listQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ owner: req.user._id, isPublished: true })
      .populate("sourceDocumentId", "title subject")
      .select("-questions.correctAnswer -questions.explanation")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: quizzes.length, quizzes });
  } catch (err) {
    next(err);
  }
};


export const getQuizById = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    if (!mongoose.isValidObjectId(quizId)) {
      return res.status(400).json({ error: "Invalid quizId." });
    }

    const quiz = await Quiz.findOne({ _id: quizId, owner: req.user._id })
      .populate("sourceDocumentId", "title subject")
      .select("-questions.correctAnswer -questions.explanation")
      .lean();

    if (!quiz) return res.status(404).json({ error: "Quiz not found." });

    return res.json({ success: true, quiz });
  } catch (err) {
    next(err);
  }
};
