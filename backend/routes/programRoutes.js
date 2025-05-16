const express = require('express');
const { saveProgram, getSavedPrograms, getProgramById } = require('../controllers/programController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/save', protect, saveProgram);
router.get('/', protect, getSavedPrograms);
router.get('/:id', protect, getProgramById);

module.exports = router;
