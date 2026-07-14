import { QuizAttempt, Flashcard, FlashcardDeck } from "../models/Study.models.js";

const titleCase = (str = "") =>
  str.split(/[\s_-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function computeStreak(sortedDates) {
  if (!sortedDates.length) return 0;
  const today   = new Date().toISOString().split("T")[0];
  const dateSet = new Set(sortedDates);
  let streak    = 0;
  let cursor    = new Date();
  if (!dateSet.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = cursor.toISOString().split("T")[0];
    if (!dateSet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const getProgress = async (req, res, next) => {
  try {
    const days          = Math.min(parseInt(req.query.days ?? "30", 10), 90);
    const subjectFilter = req.query.subject?.toLowerCase() ?? "all";
    const since         = new Date();
    since.setDate(since.getDate() - days);

    const matchFilter = { student: req.user._id, submittedAt: { $gte: since } };
    if (subjectFilter !== "all") matchFilter.subject = subjectFilter;

    const attempts = await QuizAttempt.find(matchFilter).sort({ submittedAt: 1 }).lean();


    const dailyMap = new Map();
    for (const a of attempts) {
      const key = a.submittedAt.toISOString().split("T")[0];
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { totalScore: 0, count: 0, passed: 0 });
      }
      const e = dailyMap.get(key);
      e.totalScore += a.percentageScore;
      e.count      += 1;
      if (a.passed) e.passed += 1;
    }

    const lineData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key   = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (dailyMap.has(key)) {
        const e = dailyMap.get(key);
        lineData.push({
          date:         key,
          label,
          averageScore: Math.round(e.totalScore / e.count),
          attempts:     e.count,
          passRate:     Math.round((e.passed / e.count) * 100),
        });
      } else {
        lineData.push({ date: key, label, averageScore: null, attempts: 0, passRate: null });
      }
    }


    const subjectAgg = await QuizAttempt.aggregate([
      { $match: { student: req.user._id, submittedAt: { $gte: since } } },
      {
        $group: {
          _id:            "$subject",
          averageScore:   { $avg: "$percentageScore" },
          attempts:       { $sum: 1 },
        },
      },
      { $sort: { averageScore: -1 } },
    ]);

    const radarData = subjectAgg.map((s) => ({
      subject:   titleCase(s._id ?? "General"),
      score:     Math.round(s.averageScore ?? 0),
      attempts:  s.attempts,
      fullMark:  100,
    }));


    const diffAgg = await QuizAttempt.aggregate([
      { $match: { student: req.user._id, submittedAt: { $gte: since } } },
      {
        $group: {
          _id:          "$difficulty",
          averageScore: { $avg: "$percentageScore" },
          count:        { $sum: 1 },
        },
      },
    ]);

    const difficultyData = ["easy", "medium", "hard"].map((d) => {
      const found = diffAgg.find((a) => a._id === d);
      return {
        difficulty:   d.charAt(0).toUpperCase() + d.slice(1),
        averageScore: found ? Math.round(found.averageScore) : 0,
        attempts:     found?.count ?? 0,
      };
    });

    return res.json({ success: true, periodDays: days, lineData, radarData, difficultyData });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const userId       = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [attemptStats, flashcardStats, streakDates] = await Promise.all([
      QuizAttempt.aggregate([
        { $match: { student: userId } },
        {
          $group: {
            _id:            null,
            totalAttempts:  { $sum: 1 },
            overallAverage: { $avg: "$percentageScore" },
            totalPassed:    { $sum: { $cond: ["$passed", 1, 0] } },
          },
        },
      ]),
      (async () => {
        const deckIds = await FlashcardDeck.find({ owner: userId }).distinct("_id");
        const [total, mastered, dueNow] = await Promise.all([
          Flashcard.countDocuments({ deck: { $in: deckIds } }),
          Flashcard.countDocuments({ deck: { $in: deckIds }, boxNumber: 5 }),
          Flashcard.countDocuments({ deck: { $in: deckIds }, nextReviewDate: { $lte: new Date() } }),
        ]);
        return { total, mastered, dueNow };
      })(),
      QuizAttempt.aggregate([
        { $match: { student: userId } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    const stats  = attemptStats[0] ?? {};
    const streak = computeStreak(streakDates.map((d) => d._id));

    return res.json({
      success: true,
      quizzes: {
        totalAttempts:  stats.totalAttempts ?? 0,
        overallAverage: Math.round(stats.overallAverage ?? 0),
        passRate: stats.totalAttempts
          ? Math.round((stats.totalPassed / stats.totalAttempts) * 100)
          : 0,
      },
      flashcards: {
        total:          flashcardStats.total,
        mastered:       flashcardStats.mastered,
        dueNow:         flashcardStats.dueNow,
        masteryPercent: flashcardStats.total
          ? Math.round((flashcardStats.mastered / flashcardStats.total) * 100)
          : 0,
      },
      streak: { currentStreak: streak, label: streak === 1 ? "day" : "days" },
    });
  } catch (err) {
    next(err);
  }
};

export const getHeatmap = async (req, res, next) => {
  try {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const daily = await QuizAttempt.aggregate([
      { $match: { student: req.user._id, submittedAt: { $gte: yearAgo } } },
      {
        $group: {
          _id:      { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          count:    { $sum: 1 },
          avgScore: { $avg: "$percentageScore" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const heatmapData = daily.map((d) => ({
      date:     d._id,
      count:    d.count,
      level:    Math.min(Math.floor(d.count / 2), 4),
      avgScore: Math.round(d.avgScore),
    }));

    return res.json({ success: true, heatmapData });
  } catch (err) {
    next(err);
  }
};
