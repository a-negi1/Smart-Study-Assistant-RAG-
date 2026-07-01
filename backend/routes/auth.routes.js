

import { Router } from "express";
import { body }   from "express-validator";
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
} from "../controllers/auth.controller.js";
import { authenticate }          from "../middleware/auth.middleware.js";
import { validate }              from "../middleware/validate.middleware.js";

const router = Router();


const registerValidators = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be 2–80 characters."),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("A valid email address is required."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .matches(/\d/)
    .withMessage("Password must contain at least one number."),
];

const loginValidators = [
  body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

const changePasswordValidators = [
  body("currentPassword").notEmpty().withMessage("Current password is required."),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters.")
    .matches(/\d/)
    .withMessage("New password must contain at least one number."),
];


router.post("/register", registerValidators, validate, register);
router.post("/login",    loginValidators,    validate, login);
router.post("/refresh",  refreshToken);


router.post  ("/logout",          authenticate, logout);
router.get   ("/me",              authenticate, getMe);
router.patch ("/me",              authenticate, updateProfile);
router.patch ("/change-password", authenticate, changePasswordValidators, validate, changePassword);

export default router;
