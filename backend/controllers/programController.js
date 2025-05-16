const Program = require('../models/program');

// Save a program
const saveProgram = async (req, res) => {
  const { programName, code, language } = req.body;
  
  try {
    const program = await Program.create({
      name: programName,
      code,
      language,
      user: req.user._id
    });
    
    const savedPrograms = await Program.find({ user: req.user._id }).select('name language createdAt');
    
    res.status(201).json({
      success: true,
      programId: program._id,
      savedPrograms
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get saved programs
const getSavedPrograms = async (req, res) => {
  try {
    const programs = await Program.find({ user: req.user._id }).select('name language createdAt');
    
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get program by ID
const getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    
    if (program && program.user.toString() === req.user._id.toString()) {
      res.json(program);
    } else {
      res.status(404).json({ error: 'Program not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { saveProgram, getSavedPrograms, getProgramById };
