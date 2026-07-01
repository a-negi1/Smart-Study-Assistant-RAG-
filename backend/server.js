

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";


import authRoutes      from "./routes/auth.routes.js";
import quizRoutes      from "./routes/quiz.routes.js";
import flashcardRoutes from "./routes/flashcard.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import documentRoutes  from "./routes/document.routes.js";
import notebookRoutes  from "./routes/notebook.routes.js";


await connectDB();

const app = express();


app.use(helmet());


app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,           
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());


if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}


const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
app.use(globalLimiter);


const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6,
  message: { error: "Too many AI generation requests. Please wait a moment." },
});


app.use("/api/auth",       authRoutes);
app.use("/api/quiz",       quizRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/analytics",  analyticsRoutes);
app.use("/api/documents",  documentRoutes);
app.use("/api/notebook",   notebookRoutes);


app.use("/api/quiz/generate",        aiLimiter);
app.use("/api/flashcards/generate",  aiLimiter);


app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});



app.use((err, _req, res, _next) => {
  console.error("[Unhandled Error]", err);

  const statusCode = err.statusCode ?? err.status ?? 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err.message ?? "Internal server error.";

  res.status(statusCode).json({ error: message });
});


const PORT = parseInt(process.env.PORT ?? "5000", 10);
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Study API running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV ?? "development"}\n`);
});

export default app;
