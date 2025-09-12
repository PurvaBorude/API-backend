// routes/auth.js
import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { sendEmail } from "../workers/email.js";

const router = express.Router();

// helper: sign token
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ msg: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Email already in use" });

    // if username provided, ensure uniqueness
    if (username) {
      const existsName = await User.findOne({ username });
      if (existsName) return res.status(400).json({ msg: "Username already taken" });
    }

    const user = new User({ email, password, username });
    await user.save();

    const token = signToken(user._id);
    res.status(201).json({
      user: { id: user._id, email: user.email, username: user.username },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = signToken(user._id);
    res.json({ user: { id: user._id, email: user.email, username: user.username }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Change password (authenticated, provide oldPassword and newPassword)
// or allow direct set if you want to support admin force-change (not included here)
router.put("/change-password", protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ msg: "Old and new password required" });

    const user = await User.findById(req.user._id);
    const match = await user.matchPassword(oldPassword);
    if (!match) return res.status(400).json({ msg: "Old password is incorrect" });

    user.password = newPassword; // will be hashed in pre-save
    await user.save();

    res.json({ msg: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Forgot password - generate token and email link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "No user with that email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const html = `
      <p>You (or someone) requested a password reset.</p>
      <p>Click <a href="${resetUrl}">here to reset your password</a>. The link expires in 1 hour.</p>
      <p>If you did not request this, ignore this email.</p>
    `;

    await sendEmail({ to: user.email, subject: "Password reset", html });

    res.json({ msg: "Reset link sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Reset password using token (body: newPassword)
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ msg: "New password required" });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
