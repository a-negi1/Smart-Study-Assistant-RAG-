

import { Router }        from "express";
import { authenticate }  from "../middleware/auth.middleware.js";
import {
  getConversation,
  chat,
  deleteConversation,
} from "../controllers/notebook.controller.js";

const router = Router();

router.use(authenticate);

router.get   ("/:docId",        getConversation);
router.post  ("/:docId/chat",   chat);
router.delete("/:convId/clear", deleteConversation);

export default router;
