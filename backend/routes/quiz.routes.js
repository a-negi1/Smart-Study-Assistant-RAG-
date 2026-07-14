import { Router } from "express";
import { body, param } from "express-validator";
import {
  generateQuiz,
  submitAttempt,
  listQuizzes,
  getQuizById,
} from "../controllers/quiz.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate }     from "../middleware/validate.middleware.js";

const router = Router();

router.use(authenticate);

router.post(
  "/generate",
  [
    body("documentId").isMongoId().withMessage("A valid documentId is required."),
    body("difficulty")
      .isIn(["easy", "medium", "hard"])
      .withMessage("difficulty must be easy | medium | hard."),
  ],
  validate,
  generateQuiz
);

router.post(
  "/:quizId/attempt",
  [
    param("quizId").isMongoId().withMessage("Invalid quizId."),
    body("answers").isArray({ min: 1 }).withMessage("answers array is required."),
    body("startedAt").isISO8601().withMessage("startedAt must be a valid ISO date."),
  ],
  validate,
  submitAttempt
);

router.get("/",        listQuizzes);
router.get("/:quizId", [param("quizId").isMongoId()], validate, getQuizById);

export default router;
