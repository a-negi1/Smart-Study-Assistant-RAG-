

import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  upload,
  uploadDocument,
  listDocuments,
  deleteDocument,
} from "../controllers/document.controller.js";

const router = Router();


router.use(authenticate);

router.post(
  "/upload",
  upload.single("file"),   
  uploadDocument
);

router.get("/", listDocuments);

router.delete("/:docId", deleteDocument);

export default router;
