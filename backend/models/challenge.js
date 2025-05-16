const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  language: {
    type: String,
    required: true,
    enum: ['python', 'javascript', 'both']
  },
  points: {
    type: Number,
    required: true,
    min: 1
  },
  starterCode: {
    python: String,
    javascript: String
  },
  testCases: [{
    input: String,
    expectedOutput: String
  }]
}, { timestamps: true });

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;
