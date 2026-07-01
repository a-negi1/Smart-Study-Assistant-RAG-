

import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";

export const authenticate = async (req, res, next) => {
  try {
    
    let token =
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.cookies?.accessToken ?? null;

    if (!token) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    const user = await User.findById(decoded.id).select("_id name email role").lean();

    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }

    req.user = user; 
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token. Please log in again." });
    }
    next(err);
  }
};


export const requireRole = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  };
