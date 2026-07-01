

import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { setAuthCookies, clearAuthCookies } from "../utils/index.js";


const userPayload = (user) => ({
  _id:     user._id,
  name:    user.name,
  email:   user.email,
  role:    user.role,
  avatar:  user.avatar,
  subjects: user.subjects,
  studyGoalMinutesPerDay: user.studyGoalMinutesPerDay,
  createdAt: user.createdAt,
});


export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    
    const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    
    const user = await User.create({ name, email, password });

    const accessToken  = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user:    userPayload(user),
      accessToken, 
    });
  } catch (err) {
    next(err);
  }
};


export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password +refreshToken"
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const accessToken  = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken  = refreshToken;
    user.lastActiveAt  = new Date();
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      user:    userPayload(user),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};


export const logout = async (req, res, next) => {
  try {
  
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    clearAuthCookies(res);

    return res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
};


export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "Refresh token not provided." });
    }

    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET + "_refresh");
    } catch {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid or expired refresh token. Please log in again." });
    }

    
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token reuse detected. Please log in again." });
    }

  
    const newAccessToken  = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success:     true,
      accessToken: newAccessToken,
    });
  } catch (err) {
    next(err);
  }
};


export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    return res.status(200).json({ success: true, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
};


export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ["name", "avatar", "subjects", "studyGoalMinutesPerDay"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return res.status(200).json({ success: true, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
};


export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    user.password = newPassword; 
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
};
