const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../workers/email");

const router = express.Router();

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) return res.status(401).json({ message: "No token provided" });
};

// @route   POST /api/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      email,
      password,
      username: username || undefined, // default kicks in if none
    });

    res.json({
      _id: user._id,
      email: user.email,
      username: user.username,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      email: user.email,
      username: user.username,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

// @route   GET /api/users/profile
router.get("/profile", protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    email: req.user.email,
    username: req.user.username,
  });
});


// @route   PUT /api/change-username
router.put("/change-username", protect, async (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!newUsername) return res.status(400).json({ message: "Username required" });

    const exists = await User.findOne({ username: newUsername });
    if (exists) return res.status(400).json({ message: "Username already taken" });

    req.user.username = newUsername;
    await req.user.save();

    res.json({ message: "Username updated", username: req.user.username });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/change-password
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!(await req.user.matchPassword(currentPassword)))
      return res.status(400).json({ message: "Current password incorrect" });

    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const html = `<p>You requested a password reset</p>
                  <p>Click here: <a href="${resetUrl}">${resetUrl}</a></p>`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html,
    });

    res.json({ message: "Reset link sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/reset-password/:token
router.put("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = req.body.newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
