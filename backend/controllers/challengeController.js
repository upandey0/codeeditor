const Challenge = require('../models/challenge.js');
const User = require('../models/user.js');

// Complete a challenge
const completeChallenge = async (req, res) => {
  const { challengeId, points } = req.body;
  
  try {
    // Verify the challenge exists
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    // Validate points (make sure they match the challenge)
    if (challenge.points !== parseInt(points, 10)) {
      return res.status(400).json({ error: 'Invalid points' });
    }
    
    // Update user points and achievements
    const user = await User.findById(req.user._id);
    
    // Check if user has already completed this challenge
    const alreadyCompleted = user.achievements.some(a => 
      a.type === 'challenge' && a.id === challengeId
    );
    
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }
    
    // Add points
    user.points += challenge.points;
    
    // Add achievement
    user.achievements.push({
      type: 'challenge',
      id: challengeId,
      completedAt: new Date()
    });
    
    await user.save();
    
    res.json({
      success: true,
      points: user.points,
      achievements: user.achievements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all challenges
const getChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({}).select('-testCases');
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get challenge by ID
const getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (challenge) {
      res.json(challenge);
    } else {
      res.status(404).json({ error: 'Challenge not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { completeChallenge, getChallenges, getChallengeById };
