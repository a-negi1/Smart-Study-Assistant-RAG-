
import { Router } from "express";
import { body, param } from "express-validator";
import {
  generateDeck,
  reviewCard,
  getDueCards,
  listDecks,
  getDeckCards,
} from "../controllers/flashcard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate }     from "../middleware/validate.middleware.js";

const router = Router();

router.use(authenticate);

router.post(
  "/generate",
  [
    body("text")
      .isString()
      .isLength({ min: 100 })
      .withMessage("Provide at least 100 characters of study material."),
    body("deckTitle").optional().isString().trim().isLength({ max: 200 }),
    body("subject").optional().isString().trim(),
  ],
  validate,
  generateDeck
);

router.post(
  "/:id/review",
  [
    param("id").isMongoId().withMessage("Invalid flashcard ID."),
    body("rating").isIn(["Easy", "Medium", "Hard"]).withMessage("rating must be Easy | Medium | Hard."),
  ],
  validate,
  reviewCard
);

router.get("/due",                getDueCards);
router.get("/decks",              listDecks);
router.get("/decks/:deckId/cards",[param("deckId").isMongoId()], validate, getDeckCards);

export default router;
