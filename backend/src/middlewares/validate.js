const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^0[9753]\d{8}$/).withMessage('Valid Zambian phone number required (e.g., 0977XXXXXX)'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
  body('role').optional().isIn(['customer', 'organizer']).withMessage('Role must be customer or organizer'),
  handleValidationErrors,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors,
];

const createEventValidation = [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 characters'),
  body('venue').trim().isLength({ min: 3, max: 255 }).withMessage('Venue is required'),
  body('event_date').isDate().withMessage('Valid date required'),
  body('event_time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Valid time required (HH:MM)'),
  body('ticket_types').isArray({ min: 1 }).withMessage('At least one ticket type required'),
  body('ticket_types.*.name').trim().isLength({ min: 1, max: 100 }).withMessage('Ticket type name required'),
  body('ticket_types.*.price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('ticket_types.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
  handleValidationErrors,
];

module.exports = { registerValidation, loginValidation, createEventValidation };
