const User = require('../models/user');
const generateToken = require('../utils/generateToken');
const Program = require('../models/program');

// Register a new user
const registerUser = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Check if user already exists
    const userExists = await User.findOne({ username });
    
    if (userExists) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const user = await User.create({
      username,
      password
    });
    
    if (user) {
      res.status(201).json({
        success: true,
        username: user.username,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find user by username
    const user = await User.findOne({ username });
    
    // Check if user exists and password matches
    if (user && (await user.comparePassword(password))) {
      // Update streak
      const today = new Date().toDateString();
      const lastLoginDay = new Date(user.lastLogin).toDateString();
      
      if (today !== lastLoginDay) {
        user.streak += 1;
        user.lastLogin = new Date();
        await user.save();
      }
      
      // Get saved programs
      const programs = await Program.find({ user: user._id }).select('name language createdAt');
      
      res.json({
        success: true,
        username: user.username,
        points: user.points,
        streak: user.streak,
        savedPrograms: programs,
        achievements: user.achievements,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      const programs = await Program.find({ user: user._id }).select('name language createdAt');
      
      res.json({
        username: user.username,
        points: user.points,
        streak: user.streak,
        savedPrograms: programs,
        achievements: user.achievements
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile };
