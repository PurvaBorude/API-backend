const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { name, email, password, username } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // If no username is provided → generate default one
    let finalUsername = username;
    if (!finalUsername) {
      finalUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      // Ensure it's unique
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      username: finalUsername
    });

    res.status(201).json({ 
      message: 'User registered', 
      user: { email: user.email, username: user.username, id: user._id } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Change Username
exports.changeUsername = async (req, res) => {
  try {
    const { newUsername } = req.body;
    if (!newUsername) {
      return res.status(400).json({ message: "New username is required" });
    }

    // Check if username already exists
    const existing = await User.findOne({ username: newUsername });
    if (existing) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Update
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { username: newUsername },
      { new: true }
    ).select("-password");

    res.json({ message: "Username updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
