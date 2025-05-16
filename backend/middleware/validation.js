const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User registration validation
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .isAlphanumeric()
    .withMessage('Username can only contain letters and numbers'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate
];

// User login validation
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

// Program save validation
const programValidation = [
  body('programName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Program name must be between 1 and 100 characters'),
  body('code').notEmpty().withMessage('Code is required'),
  body('language')
    .isIn(['python', 'javascript'])
    .withMessage('Language must be python or javascript'),
  validate
];

// Challenge completion validation
const challengeCompletionValidation = [
  body('challengeId').isMongoId().withMessage('Invalid challenge ID'),
  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  programValidation,
  challengeCompletionValidation
};
