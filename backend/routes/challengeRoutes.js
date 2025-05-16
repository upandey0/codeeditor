const express = require('express');
const { completeChallenge, getChallenges, getChallengeById } = require('../controllers/challengeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/complete', protect, completeChallenge);
router.get('/', getChallenges);
router.get('/:id', getChallengeById);

module.exports = router;
